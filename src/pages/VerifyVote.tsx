import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Share2, 
  Shield, 
  FileText,
  QrCode
} from 'lucide-react';

interface VoteRecord {
  id: string;
  vote_hash: string;
  created_at: string;
  candidate: {
    id: string;
    name: string;
    party?: string;
    symbol?: string;
  };
  election: {
    id: string;
    name: string;
    description: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface VerificationResult {
  isValid: boolean;
  status: 'verified' | 'invalid' | 'processing' | 'not_found';
  message: string;
  details: {
    voteExists: boolean;
    hashMatches: boolean;
    electionValid: boolean;
    userAuthorized: boolean;
  };
}

const VerifyVote: React.FC = () => {
  const { receipt } = useParams<{ receipt: string }>();
  const { user, organization, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [voteRecord, setVoteRecord] = useState<VoteRecord | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (receipt) {
      loadVoteRecord();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, receipt, user, organization]);

  const loadVoteRecord = async () => {
    if (!receipt || !user || !organization) return;

    try {
      setLoading(true);

             // Try to find the vote record by hash (receipt ID)
       const { data: vote, error: voteError } = await supabase
         .from('votes')
         .select(`
           id,
           vote_hash,
           created_at,
           candidates!inner(
             id,
             name,
             party,
             symbol
           ),
           elections!inner(
             id,
             name,
             description
           ),
           auth_users!inner(
             id,
             name,
             email
           )
         `)
         .eq('vote_hash', receipt)
         .eq('user_id', user.id)
         .single();

       if (voteError || !vote) {
         setVerificationResult({
           isValid: false,
           status: 'not_found',
           message: 'Vote record not found or you do not have permission to view this receipt.',
           details: {
             voteExists: false,
             hashMatches: false,
             electionValid: false,
             userAuthorized: false
           }
         });
         return;
       }

              // Transform the data to match our interface
       const transformedVote: VoteRecord = {
         id: vote.id,
         vote_hash: vote.vote_hash,
         created_at: vote.created_at,
         candidate: Array.isArray(vote.candidates) ? vote.candidates[0] : vote.candidates,
         election: Array.isArray(vote.elections) ? vote.elections[0] : vote.elections,
         user: Array.isArray(vote.auth_users) ? vote.auth_users[0] : vote.auth_users
       };

       setVoteRecord(transformedVote);
       await verifyVote(transformedVote);

    } catch (error) {
      console.error('Failed to load vote record:', error);
      toast({
        title: "Error",
        description: "Failed to load vote record",
        variant: "destructive"
      });
      setVerificationResult({
        isValid: false,
        status: 'invalid',
        message: 'An error occurred while loading the vote record.',
        details: {
          voteExists: false,
          hashMatches: false,
          electionValid: false,
          userAuthorized: false
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyVote = async (vote: VoteRecord) => {
    try {
      setVerifying(true);

      // Perform verification checks
      const voteExists = !!vote;
      const hashMatches = vote.vote_hash === receipt;
      const userAuthorized = vote.user.id === user?.id;

      // Check if election is valid and from the same organization
      const { data: election, error: electionError } = await supabase
        .from('elections')
        .select('organization_id')
        .eq('id', vote.election.id)
        .single();

      const electionValid = !electionError && election?.organization_id === organization?.id;

      const isValid = voteExists && hashMatches && electionValid && userAuthorized;

      let status: VerificationResult['status'] = 'verified';
      let message = 'Vote successfully verified! Your vote is valid and has been counted.';

      if (!isValid) {
        status = 'invalid';
        if (!voteExists) {
          message = 'Vote record not found in the database.';
        } else if (!hashMatches) {
          message = 'Vote hash does not match the receipt ID.';
        } else if (!userAuthorized) {
          message = 'You are not authorized to view this vote record.';
        } else if (!electionValid) {
          message = 'Election is not valid or does not belong to your organization.';
        } else {
          message = 'Vote verification failed. The vote may have been tampered with.';
        }
      }

      setVerificationResult({
        isValid,
        status,
        message,
        details: {
          voteExists,
          hashMatches,
          electionValid,
          userAuthorized
        }
      });

    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        isValid: false,
        status: 'invalid',
        message: 'An error occurred during verification.',
        details: {
          voteExists: false,
          hashMatches: false,
          electionValid: false,
          userAuthorized: false
        }
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!voteRecord) return;

    const receiptData = {
      receiptId: voteRecord.vote_hash,
      electionName: voteRecord.election.name,
      candidateName: voteRecord.candidate.name,
      voterName: voteRecord.user.name,
      voteTime: new Date(voteRecord.created_at).toLocaleString(),
      verificationStatus: verificationResult?.isValid ? 'Verified' : 'Invalid'
    };

    const content = `
VOTE RECEIPT
============

Receipt ID: ${receiptData.receiptId}
Election: ${receiptData.electionName}
Candidate: ${receiptData.candidateName}
Voter: ${receiptData.voterName}
Vote Time: ${receiptData.voteTime}
Status: ${receiptData.verificationStatus}

This receipt serves as proof of your vote submission.
Keep this receipt for your records.

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vote-receipt-${voteRecord.vote_hash.slice(-8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Receipt Downloaded",
      description: "Vote receipt has been downloaded successfully"
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'Vote Verification Receipt',
        text: `Verify my vote for ${voteRecord?.election.name}`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Verification link copied to clipboard"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading vote record...</p>
        </div>
      </div>
    );
  }

  if (!voteRecord && verificationResult?.status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Vote Record Not Found</h1>
          <p className="text-gray-600 mb-6">
            The vote record you're looking for could not be found, or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If no receipt is provided, show form to enter receipt
  if (!receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Vote Verification</h1>
            <p className="text-gray-600">
              Enter your vote receipt ID to verify your vote
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const receiptId = formData.get('receipt') as string;
                if (receiptId) {
                  navigate(`/verify-vote/${receiptId}`);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="receipt">Receipt ID</Label>
                    <Input
                      id="receipt"
                      name="receipt"
                      type="text"
                      placeholder="Enter your vote receipt ID"
                      required
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Verify Vote
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vote Verification</h1>
        <p className="text-gray-600">Receipt ID: {receipt}</p>
      </div>

      {/* Verification Status */}
      <div className="mb-8">
        <Card className={`border-2 ${
          verificationResult?.isValid 
            ? 'border-green-200 bg-green-50' 
            : verificationResult?.status === 'processing'
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-4 mb-4">
              {verifying ? (
                <Loader2 className="h-12 w-12 animate-spin text-yellow-600" />
              ) : verificationResult?.isValid ? (
                <CheckCircle className="h-12 w-12 text-green-600" />
              ) : verificationResult?.status === 'processing' ? (
                <Clock className="h-12 w-12 text-yellow-600" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {verifying ? 'Verifying...' : 
                   verificationResult?.isValid ? '✅ Vote Verified' :
                   verificationResult?.status === 'processing' ? '⏳ Processing' :
                   '❌ Verification Failed'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {verificationResult?.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {voteRecord && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Receipt Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Receipt Details</span>
                </CardTitle>
                <CardDescription>
                  Detailed information about your vote
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Election</label>
                    <p className="font-medium">{voteRecord.election.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vote Time</label>
                    <p className="font-medium">
                      {new Date(voteRecord.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-500">Selected Candidate</label>
                  <div className="flex items-center space-x-3 mt-1">
                    {voteRecord.candidate.symbol && (
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full">
                        <span className="text-lg">{voteRecord.candidate.symbol}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{voteRecord.candidate.name}</p>
                      {voteRecord.candidate.party && (
                        <p className="text-sm text-gray-500">{voteRecord.candidate.party}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-500">Voter Information</label>
                  <p className="font-medium">{voteRecord.user.name}</p>
                  <p className="text-sm text-gray-500">{voteRecord.user.email}</p>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-500">Receipt Hash</label>
                  <div className="bg-gray-50 p-3 rounded-md mt-1">
                    <code className="text-xs font-mono break-all">
                      {voteRecord.vote_hash}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification Details & Actions */}
          <div className="space-y-6">
            {/* Verification Details */}
            {verificationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Verification Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Vote Exists</span>
                      {verificationResult.details.voteExists ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Hash Matches</span>
                      {verificationResult.details.hashMatches ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Election Valid</span>
                      {verificationResult.details.electionValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>User Authorized</span>
                      {verificationResult.details.userAuthorized ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* QR Code Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5" />
                  <span>QR Code</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-32 bg-gray-50 rounded-md">
                  <div className="text-center text-gray-500">
                    <QrCode className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">QR Code</p>
                    <p className="text-xs">Feature coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                onClick={handleDownloadReceipt} 
                variant="outline" 
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Button 
                onClick={handleShare} 
                variant="outline" 
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Receipt
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyVote;
