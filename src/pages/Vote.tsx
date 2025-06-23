import { useState, useEffect } from "react";
import { Vote as VoteIcon, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { generateVoteReceipt } from '@/lib/receipt';
import { supabase } from '@/lib/supabase';
import { castVote, hasVotedInElection } from '@/lib/api/voting';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ethers } from "ethers";

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

const Vote = () => {
  const { electionId } = useParams();
  const [election, setElection] = useState<Election | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVotingLive, setIsVotingLive] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmVoteFor, setConfirmVoteFor] = useState<{id: string; name: string; party: string} | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is authenticated
      const isAuth = localStorage.getItem('isAuthenticated');
      if (!isAuth) {
        navigate('/login');
        return;
      }

      // Load election data
      if (!electionId) {
        setError("No election ID provided");
        setLoading(false);
        return;
      }

      try {
        // Get election data
        const { data: election, error: electionError } = await supabase
          .from('elections')
          .select(`
            *,
            candidates (*)
          `)
          .eq('id', electionId)
          .single();

        if (electionError) {
          if (electionError.code === 'PGRST116') {
            setError("Election not found");
          } else {
            setError("Failed to load election data");
          }
          setLoading(false);
          return;
        }

        // Check if election exists and is active
        if (!election) {
          setError("Election not found");
          setLoading(false);
          return;
        }

        // Check if election is live
        const now = new Date();
        const startTime = new Date(election.start_time);
        const endTime = new Date(election.end_time);
        const isLive = now >= startTime && now <= endTime;

        if (!isLive) {
          setError(now < startTime ? "Election has not started yet" : "Election has ended");
          setLoading(false);
          return;
        }

        // Check if user has already voted in this election
        const userDID = localStorage.getItem('userDID');
        if (!userDID) {
          navigate('/login');
          return;
        }

        const hasVoted = await hasVotedInElection(userDID, electionId);
        if (hasVoted) {
          // Get vote receipt
          const { data: vote } = await supabase
            .from('votes')
            .select('id')
            .eq('election_id', electionId)
            .eq('voter_did', userDID)
            .single();

          if (vote) {
            setVoteReceipt(vote.id);
          }
        }

        setElection(election);
        setIsVotingLive(isLive);
        setHasVoted(hasVoted);
      } catch (error) {
        console.error('Error loading election:', error);
        setError("Failed to load election data");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [electionId, navigate]);

  const handleVote = async (candidateId: string) => {
    try {
      const userDID = localStorage.getItem('userDID');
      if (!userDID || !election) return;

      // Create ethers provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get election data with encryption keys
      const { data: electionData, error: electionError } = await supabase
        .from('elections')
        .select('encryption_keys')
        .eq('id', election.id)
        .single();

      if (electionError || !electionData?.encryption_keys?.publicKey?.n || !electionData?.encryption_keys?.publicKey?.g) {
        throw new Error('Failed to load election encryption keys. Please try again.');
      }

      // Cast vote using the voting API
      const result = await castVote(election.id, userDID, candidateId, signer);

      setVoteReceipt(result.voteId);
      setHasVoted(true);
      
      toast({
        title: "Vote Submitted Successfully",
        description: "Your vote has been encrypted and stored securely",
      });
    } catch (error) {
      console.error('Failed to cast vote:', error);
      toast({
        title: "Failed to Cast Vote",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleViewReceipt = () => {
    navigate(`/vote-receipt/${voteReceipt}`);
  };

  const initiateVote = (candidate: { id: string; name: string; party: string }) => {
    setConfirmVoteFor(candidate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B21E8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election data...</p>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-6 w-6" />
                Election Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-red-800 font-medium">
                  {error || "The requested election could not be found."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <h4 className="font-semibold mb-2">This might happen because:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>The election ID is incorrect</li>
                    <li>The election has been archived or removed</li>
                    <li>The election hasn't started yet</li>
                    <li>The election has already ended</li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <VoteIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">{election.name}</h1>
              <div className="flex items-center gap-2">
                {isVotingLive ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600 font-medium">Voting Live</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600">Voting Not Started</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Vote Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VoteIcon className="h-6 w-6" />
              Select Your Candidate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasVoted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">You have already voted!</h3>
                <p className="text-muted-foreground mb-4">
                  Your vote has been securely recorded in the database.
                </p>
                <Button onClick={handleViewReceipt}>
                  View Vote Receipt
                </Button>
              </div>
            ) : isVotingLive ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {election.candidates.map((candidate) => (
                  <Card key={candidate.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-4">{candidate.symbol}</div>
                      <h3 className="font-semibold text-lg mb-2">{candidate.name}</h3>
                      <p className="text-muted-foreground mb-4">{candidate.party}</p>
                      <Button 
                        onClick={() => initiateVote(candidate)}
                        className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                      >
                        Vote
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Voting hasn't started yet</h3>
                <p className="text-muted-foreground">
                  Please wait for the voting period to begin.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmVoteFor} onOpenChange={() => setConfirmVoteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to vote for {confirmVoteFor?.name} from {confirmVoteFor?.party}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmVoteFor(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmVoteFor) {
                  handleVote(confirmVoteFor.id);
                  setConfirmVoteFor(null);
                }
              }}
            >
              Yes, Cast My Vote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vote; 