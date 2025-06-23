import { useState, useEffect } from "react";
import { Shield, User, FileText, LogOut, CheckCircle, Clock, Users, Eye, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { generateVoteReceipt } from '@/lib/receipt';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface DatabaseVote {
  id: string;
  election_id: string;
  timestamp: string;
  elections: {
    name: string;
  };
}

interface VoteHistoryItem {
  election_id: string;
  election_name: string;
  vote_id: string;
  timestamp: string;
}

const Dashboard = () => {
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDID, setUserDID] = useState("");
  const [userData, setUserData] = useState<any>(null);
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

      // Load user data
      const did = localStorage.getItem('userDID');
      if (!did) {
        navigate('/login');
        return;
      }

      try {
        // Get user data
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('did', did)
          .single();

        if (userError) {
          if (userError.code === 'PGRST116') {
            console.error('User not found');
            localStorage.clear();
            navigate('/login');
            return;
          }
          throw userError;
        }

        if (!user) {
          console.error('User not found');
          localStorage.clear();
          navigate('/login');
          return;
        }

        // Get active elections
        const now = new Date().toISOString();
        const { data: elections, error: electionError } = await supabase
          .from('elections')
          .select(`
            *,
            candidates (*)
          `)
          .eq('is_active', true)
          .gte('end_time', now)
          .order('start_time', { ascending: true });

        if (electionError) throw electionError;

        // Get user's vote history
        const { data: votes, error: votesError } = await supabase
          .from('votes')
          .select(`
            id,
            election_id,
            timestamp,
            elections (
              name
            )
          `)
          .eq('voter_did', did)
          .order('timestamp', { ascending: false });

        if (votesError) throw votesError;

        const history = (votes as unknown as DatabaseVote[])?.map(vote => ({
          election_id: vote.election_id,
          election_name: vote.elections.name,
          vote_id: vote.id,
          timestamp: vote.timestamp
        })) || [];

        setUserDID(did);
        setUserData(user);
        setActiveElections(elections || []);
        setVoteHistory(history);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load user data. Please try logging in again.",
          variant: "destructive"
        });
        localStorage.clear();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  const handleLogout = () => {
    localStorage.clear();
    toast({
      title: "Logged Out",
      description: "MetaMask disconnected and session cleared",
    });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B21E8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <User className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Voter Dashboard</h1>
              <div className="text-sm text-muted-foreground">
                Welcome back, {userData?.name}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Elections */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5" />
                  Active Elections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeElections.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Active Elections</h3>
                    <p className="text-muted-foreground">
                      There are no elections currently active. Please check back later.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeElections.map((election) => {
                      const now = new Date();
                      const startTime = new Date(election.start_time);
                      const endTime = new Date(election.end_time);
                      const isStarted = now >= startTime;
                      const isEnded = now >= endTime;
                      const isLive = isStarted && !isEnded;

                      return (
                        <Card key={election.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{election.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {isLive ? (
                                    <span className="text-green-600">Live Now</span>
                                  ) : !isStarted ? (
                                    <span className="text-orange-600">Starts {startTime.toLocaleDateString()}</span>
                                  ) : (
                                    <span className="text-red-600">Ended {endTime.toLocaleDateString()}</span>
                                  )}
                                </p>
                              </div>
                              <Button
                                onClick={() => navigate(`/vote/${election.id}`)}
                                disabled={!isLive}
                                className={isLive ? "bg-[#6B21E8] hover:bg-[#6B21E8]/90" : ""}
                              >
                                {isLive ? "Vote Now" : "Not Available"}
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {election.candidates.map((candidate) => (
                                <div key={candidate.id} className="p-3 bg-muted rounded-lg">
                                  <div className="text-2xl mb-2">{candidate.symbol}</div>
                                  <div className="font-medium">{candidate.name}</div>
                                  <div className="text-sm text-muted-foreground">{candidate.party}</div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Info and Recent Activity */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Voter Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">DID</span>
                    <span className="text-sm font-mono">{userDID.slice(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Email</span>
                    <span className="text-sm">{userData?.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {voteHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">No Voting History</p>
                    <p className="text-xs text-muted-foreground">
                      You haven't voted in any elections yet. When you cast a vote, your voting history and receipts will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {voteHistory.map((vote) => (
                      <div key={vote.vote_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{vote.election_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Voted on {new Date(vote.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/vote-receipt/${vote.vote_id}`)}
                          className="hover:bg-[#6B21E8] hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Receipt
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
