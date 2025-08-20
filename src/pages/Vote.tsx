import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, votingApi } from '@/lib/supabase';
import { electionApi } from '@/lib/electionApi';
import {
  Vote, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Shield,
  ArrowLeft,
  Info,
  Target
} from 'lucide-react';

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  candidates?: Array<{
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
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, organization, userRole, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (userRole !== 'student') {
      toast({
        title: "Access Denied",
        description: "Only students can vote in elections",
        variant: "destructive"
      });
      navigate('/dashboard');
      return;
    }

    loadElectionData();
  }, [isAuthenticated, userRole, electionId]);

  const loadElectionData = async () => {
    if (!electionId || !organization) return;

    try {
      setLoading(true);

      // Load election data using the API
      const electionData = await electionApi.getElection(electionId);

      if (!electionData) {
        throw new Error('Election not found');
      }

      // Verify the election belongs to the user's organization
      if (electionData.organization_id !== organization.id) {
        throw new Error('Election not found');
      }

      setElection(electionData);

      // Check if user has already voted - handle error gracefully
      try {
        const hasVotedResult = await votingApi.hasVoted(user?.id, electionId);
        setHasVoted(hasVotedResult);
      } catch (voteCheckError) {
        console.warn('Could not check vote status, assuming not voted:', voteCheckError);
        setHasVoted(false);
      }

    } catch (error) {
      console.error('Failed to load election data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load election data",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !election || !user) return;

    try {
      setVoting(true);

      // Cast the vote
      const voteResult = await votingApi.castVote({
        candidateId: selectedCandidate,
        electionId: election.id,
        userId: user.id
      });

      toast({
        title: "Vote Submitted",
        description: "Your vote has been successfully submitted"
      });

      setHasVoted(true);
      setShowConfirmation(false);

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Failed to submit vote:', error);
      toast({
        title: "Voting Failed",
        description: error instanceof Error ? error.message : "Failed to submit vote",
        variant: "destructive"
      });
    } finally {
      setVoting(false);
    }
  };

  const getElectionStatus = () => {
    if (!election) return { status: 'loading', message: 'Loading...' };

    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return { status: 'upcoming', message: 'Voting has not started yet' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'active', message: 'Voting is currently active' };
    } else {
      return { status: 'ended', message: 'Voting has ended' };
    }
  };

  const canVote = () => {
    if (!election || hasVoted) return false;
    const status = getElectionStatus();
    return status.status === 'active' && election.is_active;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election...</p>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Election Not Found</h2>
          <p className="text-gray-600 mb-4">The election you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const electionStatus = getElectionStatus();

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{election.name}</h1>
              <p className="text-gray-600">
                {organization?.name} • {electionStatus.message}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={electionStatus.status === 'active' ? 'default' : 'secondary'}>
                {electionStatus.status === 'active' ? 'Active' : electionStatus.status === 'upcoming' ? 'Upcoming' : 'Ended'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Election Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Election Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Start Time</p>
                <p className="text-lg">{new Date(election.start_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">End Time</p>
                <p className="text-lg">{new Date(election.end_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Candidates</p>
                <p className="text-lg">{election.candidates?.length || 0} candidates</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Your Status</p>
                <p className="text-lg">
                  {hasVoted ? (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Already Voted
                    </span>
                  ) : (
                    <span className="text-blue-600 flex items-center">
                      <Vote className="h-4 w-4 mr-1" />
                      Not Voted
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voting Section */}
        {hasVoted ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">You Have Already Voted</h3>
              <p className="text-green-700 mb-4">
                Thank you for participating in this election. Your vote has been recorded.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : !canVote() ? (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-yellow-800 mb-2">Voting Not Available</h3>
              <p className="text-yellow-700 mb-4">
                {electionStatus.message}
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Candidate Selection */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Select Your Candidate
                </CardTitle>
                <CardDescription>
                  Choose your preferred candidate. You can only vote once.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {election.candidates?.map((candidate) => (
                    <Card 
                      key={candidate.id}
                      className={`cursor-pointer transition-all ${
                        selectedCandidate === candidate.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCandidate(candidate.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {selectedCandidate === candidate.id ? (
                              <CheckCircle className="h-6 w-6 text-blue-600" />
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{candidate.name}</h3>
                            {candidate.party && (
                              <p className="text-sm text-gray-600">{candidate.party}</p>
                            )}
                            {candidate.symbol && (
                              <p className="text-sm text-gray-500">Symbol: {candidate.symbol}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vote Confirmation */}
            {selectedCandidate && (
              <Card className="mb-8 bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <Shield className="h-5 w-5 mr-2" />
                    Confirm Your Vote
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-blue-700 mb-2">
                      You have selected: <strong>{election.candidates?.find(c => c.id === selectedCandidate)?.name}</strong>
                    </p>
                    <p className="text-sm text-blue-600">
                      Please confirm your selection. Once submitted, your vote cannot be changed.
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleVote}
                      disabled={voting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {voting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting Vote...
                        </>
                      ) : (
                        <>
                          <Vote className="h-4 w-4 mr-2" />
                          Submit Vote
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedCandidate(null)}
                      disabled={voting}
                    >
                      Change Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Notice */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Vote Security</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Your vote is encrypted and secure</li>
                      <li>• You can only vote once per election</li>
                      <li>• Your vote is anonymous and confidential</li>
                      <li>• The system prevents double voting</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default VotePage; 