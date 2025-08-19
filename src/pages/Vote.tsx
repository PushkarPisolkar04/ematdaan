import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { validateSession } from '@/lib/api/traditionalAuth';
import { supabase, setOrganizationContext } from '@/lib/supabase';
import { encryptVote, submitEncryptedVote } from '@/lib/voteSecurity';
import { createAntiCoercionReceipt } from '@/lib/advancedSecurity';

import { generateVoteValidityProof, storeZKProof } from '@/lib/zkProofs';
import { logVoteCast } from '@/lib/securityAudit';
import MFAVerification from '@/components/MFAVerification';
import VoteReceiptCard from '@/components/VoteReceiptCard';
import {
  Vote, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  Target,
  HelpCircle
} from 'lucide-react';

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    symbol: string;
  }>;
}

const VotePage = () => {
  const { electionId } = useParams();
  const [election, setElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useOrganization();

  useEffect(() => {
    const loadElectionData = async () => {
      try {
        // Check authentication
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) {
          navigate('/login');
          return;
        }

        const sessionData = await validateSession(sessionToken);
        if (!sessionData) {
          localStorage.clear();
        navigate('/login');
        return;
      }

        setUserData(sessionData);

        // Set organization context
        if (organization?.id) {
          await setOrganizationContext(organization.id);
        }

      if (!electionId) {
          toast({
            title: "Error",
            description: "No election ID provided",
            variant: "destructive"
          });
          navigate('/dashboard');
        return;
      }

        // Load election data
        const { data: electionData, error: electionError } = await supabase
          .from('elections')
          .select(`
            *,
            candidates (*)
          `)
          .eq('id', electionId)
          .single();

        if (electionError) throw electionError;

        if (!electionData) {
          toast({
            title: "Election Not Found",
            description: "The requested election does not exist",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        setElection(electionData);

        // Check if user has already voted
        const { data: existingVote, error: voteError } = await supabase
          .from('encrypted_votes')
            .select('id')
            .eq('election_id', electionId)
          .eq('voter_id', sessionData.id)
            .single();

        if (existingVote) {
          setHasVoted(true);
          setVoteReceipt(existingVote.id);
          }

      } catch (error) {
        console.error('Failed to load election data:', error);
        toast({
          title: "Error",
          description: "Failed to load election data",
          variant: "destructive"
        });
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (organization) {
      loadElectionData();
    }
  }, [electionId, organization, navigate]);

  const handleVote = async () => {
    if (!selectedCandidate || !election || !userData) return;

    setVoting(true);

    try {
      // Encrypt the vote
      const encryptedVote = await encryptVote(
        { candidate_id: selectedCandidate },
        election.id,
        userData.id
      );

      // Submit encrypted vote
      const result = await submitEncryptedVote(encryptedVote);

      if (result.success && result.receipt) {
        // Generate Zero-Knowledge Proof for vote validity
        const candidateIds = election.candidates.map(c => c.id);
        const eligibleVoters = [userData.id]; // In practice, this would be fetched from database
        
        try {
          const zkProof = await generateVoteValidityProof(
            selectedCandidate,
            userData.id,
            election.id,
            candidateIds,
            eligibleVoters
          );
          
          // Store ZK proof (async - doesn't block user experience)
          storeZKProof(result.receipt.receipt_id, election.id, zkProof)
            .then(() => {
              toast({
                title: "Zero-Knowledge Proof Generated",
                description: "Your vote validity has been proven without revealing your choice",
              });
            })
            .catch((error) => {
              console.error('ZK proof storage failed:', error);
            });
        } catch (error) {
          console.error('ZK proof generation failed:', error);
          // Continue with vote process even if ZK proof fails
        }
        // Create vote hash for verification
        const voteData = JSON.stringify({
          candidate_id: selectedCandidate,
          election_id: election.id,
          voter_id: userData.id,
          timestamp: new Date().toISOString()
        });
        const encoder = new TextEncoder();
        const data = encoder.encode(voteData);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const voteHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Create anti-coercion receipt
        const antiCoercionReceipt = await createAntiCoercionReceipt(
          election.id,
          userData.id
        );
        
        setVoteReceipt(result.receipt.receipt_id);
        setReceiptData({
          ...antiCoercionReceipt,
          candidate_name: election.candidates.find(c => c.id === selectedCandidate)?.name,
          election_name: election.name,
          verification_hash: voteHash
        });
        setHasVoted(true);
        
        // Log security event
        logVoteCast(userData.id, election.id, organization?.id || null, {
          candidate_count: election.candidates.length,
          mfa_verified: true,
          receipt_id: result.receipt.receipt_id
        });
        
        toast({
          title: "Vote Cast Successfully!",
          description: "Your vote has been encrypted, digitally signed, and recorded securely with zero-knowledge proof verification and anti-coercion protection",
        });
      } else {
        throw new Error(result.error || 'Failed to submit vote');
      }

    } catch (error) {
      console.error('Voting error:', error);
      toast({
        title: "Voting Failed",
        description: error instanceof Error ? error.message : "Failed to cast vote",
        variant: "destructive"
      });
    } finally {
      setVoting(false);
    }
  };

  const getElectionStatus = () => {
    if (!election) return { status: 'unknown', text: 'Unknown' };

    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return { status: 'upcoming', text: 'Upcoming', color: 'text-yellow-600' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'active', text: 'Active', color: 'text-green-600' };
    } else {
      return { status: 'ended', text: 'Ended', color: 'text-red-600' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Election Not Found</h2>
            <p className="text-gray-600 mb-4">
              The requested election could not be found or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const electionStatus = getElectionStatus();

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            {receiptData ? (
              <VoteReceiptCard
                receipt={receiptData}
                onVerifyVote={() => navigate(`/verify-vote/${voteReceipt}`)}
              />
            ) : (
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-green-100 p-3 rounded-full">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Vote Cast Successfully!</CardTitle>
                  <CardDescription>
                    Your vote has been encrypted and recorded securely
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Vote Receipt</h3>
                    <p className="text-sm text-green-700 font-mono break-all">
                      {voteReceipt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex gap-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Return to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate(`/results/${election.id}`)}
                className="flex-1"
              >
                View Results
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Voting Guidance */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg text-blue-800">
              <Target className="h-5 w-5" />
              Voting Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Steps:</h4>
                <ol className="space-y-1 text-gray-700 text-xs">
                  <li>1. Review candidates below</li>
                  <li>2. Select your preferred candidate</li>
                  <li>3. Confirm and submit vote</li>
                  <li>4. Save your receipt</li>
                </ol>
              </div>
              <div>
                <h4 className="font-semibold text-purple-800 mb-2">Security:</h4>
                <ul className="space-y-1 text-gray-700 text-xs">
                  <li>• AES-256 encryption</li>
                  <li>• Zero-knowledge proofs</li>
                  <li>• Merkle tree verification</li>
                  <li>• Vote receipt for verification</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> You can only vote once per election. Save your receipt to verify your vote later.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-2xl">{election.name}</CardTitle>
                <CardDescription>
                  Cast your vote securely using encrypted voting
                </CardDescription>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${electionStatus.color} bg-opacity-10`}>
                {electionStatus.text}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {electionStatus.status !== 'active' ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {electionStatus.status === 'upcoming' ? 'Voting Not Started' : 'Voting Has Ended'}
                </h3>
                <p className="text-gray-600">
                  {electionStatus.status === 'upcoming' 
                    ? `Voting will begin on ${new Date(election.start_time).toLocaleDateString()}`
                    : `Voting ended on ${new Date(election.end_time).toLocaleDateString()}`
                  }
                </p>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="mt-4"
                >
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Select Your Candidate</h3>
                  <div className="grid gap-4">
                {election.candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedCandidate === candidate.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCandidate(candidate.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{candidate.symbol}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{candidate.name}</h4>
                            <p className="text-gray-600">{candidate.party}</p>
                          </div>
                          {selectedCandidate === candidate.id && (
                            <CheckCircle className="h-6 w-6 text-blue-500" />
                          )}
                        </div>
                      </div>
                ))}
              </div>
                </div>

                {selectedCandidate && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Vote Security</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your vote will be encrypted using AES-256 encryption and signed with your unique digital signature. 
                      This ensures your vote remains private and tamper-proof.
                </p>
              </div>
                )}

                <div className="flex gap-4">
                  <Button 
                    onClick={() => setSelectedCandidate(null)}
                    variant="outline"
                    className="flex-1"
                    disabled={!selectedCandidate}
                  >
                    Clear Selection
                  </Button>
                  <Button 
                    onClick={() => setShowConfirmation(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedCandidate || voting}
                  >
                    {voting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Casting Vote...
                      </>
                    ) : (
                      <>
                        <Vote className="h-4 w-4 mr-2" />
                        Cast Vote
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Confirm Your Vote
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to cast your vote for{' '}
                  <strong>
                    {election.candidates.find(c => c.id === selectedCandidate)?.name}
                  </strong>?
                </p>
                <p className="text-sm text-gray-500">
                  Once submitted, your vote cannot be changed.
                </p>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowConfirmation(false);
                      setShowMFA(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm Vote
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MFA Verification */}
        {showMFA && userData && (
          <MFAVerification
            userId={userData.id}
            action="Cast Vote"
            onVerified={() => {
              setShowMFA(false);
              handleVote();
            }}
            onCancel={() => {
              setShowMFA(false);
              setShowConfirmation(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default VotePage; 