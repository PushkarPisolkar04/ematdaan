import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, votingApi } from '@/lib/supabase';
import { electionApi } from '@/lib/electionApi';
import { candidateApi } from '@/lib/candidateApi';

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
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
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

      const electionData = await electionApi.getElection(electionId);

      if (!electionData) {
        throw new Error('Election not found');
      }

      if (electionData.organization_id !== organization.id) {
        throw new Error('Election not found');
      }

      if (!electionData.candidates || electionData.candidates.length === 0) {
        try {
          const candidatesData = await candidateApi.getCandidates(electionId);
          electionData.candidates = candidatesData || [];
        } catch (candidateError) {
          console.error('Failed to load candidates separately:', candidateError);
          electionData.candidates = [];
        }
      }

      setElection(electionData);
      
      try {
        const hasVotedStatus = await votingApi.hasVoted(user.id, electionId);
        setHasVoted(hasVotedStatus);
      } catch (voteCheckError) {
        console.error('Failed to check voting status:', voteCheckError);
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

    if (hasVoted) {
      toast({
        title: "Already Voted",
        description: "You have already voted in this election",
        variant: "destructive"
      });
      return;
    }

    try {
      setVoting(true);
      
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
      setShowConfirmationDialog(false);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
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
              <span className="text-red-500 text-6xl">⚠️</span>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Election Not Found</h2>
              <p className="text-gray-600 mb-4">The election you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
              </Button>
            </div>
          </div>
    );
  }

  const electionStatus = getElectionStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            ← Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-purple-100 p-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{election.name}</h1>
              <p className="text-lg text-gray-600">
                {organization?.name} • {electionStatus.message}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`text-base px-4 py-2 ${
                electionStatus.status === 'active' 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : electionStatus.status === 'upcoming' 
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {electionStatus.status === 'active' ? 'Active' : electionStatus.status === 'upcoming' ? 'Upcoming' : 'Ended'}
              </Badge>
            </div>
          </div>
        </div>

        <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-600 mb-1">Start</p>
                <p className="text-gray-900">{new Date(election.start_time).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600 mb-1">End</p>
                <p className="text-gray-900">{new Date(election.end_time).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600 mb-1">Candidates</p>
                <p className="text-gray-900">{election.candidates?.length || 0}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600 mb-1">Status</p>
                <p className={hasVoted ? "text-green-600" : "text-blue-600"}>
                  {hasVoted ? "Voted" : "Not Voted"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasVoted ? (
          <Card className="bg-green-50 border-green-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">✓</span>
              </div>
              <h3 className="text-2xl font-semibold text-green-800 mb-3">You Have Already Voted</h3>
              <p className="text-lg text-green-700 mb-6">
                Thank you for participating in this election. Your vote has been recorded.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="bg-green-600 hover:bg-green-700 h-12 px-6">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : !canVote() ? (
          <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="p-4 bg-yellow-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <span className="text-4xl">⏰</span>
              </div>
              <h3 className="text-2xl font-semibold text-yellow-800 mb-3">Voting Not Available</h3>
              <p className="text-lg text-yellow-700 mb-6">
                {electionStatus.message}
              </p>
              <Button onClick={() => navigate('/dashboard')} className="bg-yellow-600 hover:bg-yellow-700 h-12 px-6">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6 bg-white border-2 border-purple-200 shadow-lg">
              <CardHeader className="pb-4 bg-purple-50 border-b border-purple-100">
                <CardTitle className="text-2xl text-purple-900">
                  Select Your Candidate
                </CardTitle>
                <CardDescription className="text-lg text-purple-700">
                  Choose your preferred candidate. You can only vote once.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {election.candidates && election.candidates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {election.candidates.map((candidate, index) => (
                      <Card 
                        key={candidate.id}
                        className="transition-all duration-300 hover:shadow-md border-gray-200"
                      >
                        <CardContent className="p-8">
                          <div className="flex items-center space-x-6">
                            <div className="flex-shrink-0">
                              <div className="h-16 w-16 rounded-full border-3 border-gray-300 flex items-center justify-center bg-gray-100">
                                <span className="text-2xl font-bold text-gray-700">{index + 1}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-900 mb-2">{candidate.name}</h3>
                              {candidate.party && (
                                <p className="text-lg text-gray-600 mb-2">{candidate.party}</p>
                              )}
                              {candidate.symbol && (
                                <Badge variant="outline" className="text-base border-purple-200 text-purple-700 bg-purple-50 px-3 py-1">
                                  {candidate.symbol}
                                </Badge>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCandidate(candidate.id);
                                  setShowConfirmationDialog(true);
                                }}
                                className="bg-purple-600 hover:bg-purple-700 h-12 px-6 text-lg font-semibold text-white"
                              >
                                Vote Now
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="p-6 bg-red-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <span className="text-6xl">❌</span>
                    </div>
                    <h3 className="text-3xl font-bold text-red-900 mb-4">No Candidates Available</h3>
                    <p className="text-xl text-red-700 mb-6">No candidates have been added to this election yet.</p>
                    <p className="text-lg text-gray-600">Please contact your election administrator to add candidates.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm font-medium text-gray-700">Vote Security</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span>Encrypted & secure</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span>One vote per election</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span>Anonymous & confidential</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span>Prevents double voting</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
          <DialogContent className="sm:max-w-md" title="Confirm Vote">
            <DialogHeader>
              <DialogTitle className="text-2xl text-green-900">
                Confirm Your Vote
              </DialogTitle>
              <DialogDescription className="text-lg text-green-700 pt-4">
                You have selected: <strong className="text-xl">{election.candidates?.find(c => c.id === selectedCandidate)?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-base text-gray-600">
                Please confirm your selection. Once submitted, your vote cannot be changed.
              </p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleVote}
                disabled={voting}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 h-12 px-6 text-lg font-semibold text-white border-2 border-purple-600"
              >
                {voting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting Vote...
                  </>
                ) : (
                  <>
                    Submit Vote
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedCandidate(null);
                  setShowConfirmationDialog(false);
                }}
                disabled={voting}
                className="w-full sm:w-auto h-12 px-6 text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VotePage; 