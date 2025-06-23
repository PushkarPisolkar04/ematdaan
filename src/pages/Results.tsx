import { useState, useEffect } from "react";
import { Trophy, Users, TrendingUp, BarChart3, PieChart, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { electionApi } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ElectionResult {
  id: string;
  name: string;
  totalVotes: number;
  totalRegistered: number;
  turnoutPercentage: number;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    symbol: string;
    votes: number;
    percentage: number;
  }>;
  merkleRoot: string;
  electionPeriod: {
    start: string;
    end: string;
  };
}

const Results = () => {
  const [pastElections, setPastElections] = useState<ElectionResult[]>([]);
  const [selectedElection, setSelectedElection] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPastElections = async () => {
      try {
        const elections = await electionApi.getPastElections();
        setPastElections(elections);
        if (elections.length > 0) {
          setSelectedElection(elections[0]);
        }
      } catch (error) {
        console.error('Failed to fetch past elections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPastElections();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B21E8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading election results...</p>
        </div>
      </div>
    );
  }

  if (pastElections.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-border p-8">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Election Results</h1>
          </div>
        </header>
        
        <div className="container mx-auto p-6">
          <Card className="text-center p-8">
            <CardContent>
              <Clock className="h-12 w-12 text-[#6B21E8]/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Past Elections</h3>
              <p className="text-muted-foreground">
                There are no completed elections to display results for. Please check back after an election has ended.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!selectedElection) return null;

  // Add default values to prevent NaN
  const totalVotes = selectedElection.totalVotes || 0;
  const totalRegistered = selectedElection.totalRegistered || 0;
  const notVoted = Math.max(0, totalRegistered - totalVotes);
  const notVotedPercentage = totalRegistered > 0 ? (notVoted / totalRegistered) * 100 : 0;
  const turnoutPercentage = totalRegistered > 0 ? (totalVotes / totalRegistered) * 100 : 0;

  const winner = selectedElection.candidates && selectedElection.candidates.length > 0
    ? selectedElection.candidates.reduce((prev, current) => 
    prev.votes > current.votes ? prev : current
      )
    : null;

  const isElectionLive = new Date() >= new Date(selectedElection.electionPeriod.start) && 
                        new Date() <= new Date(selectedElection.electionPeriod.end);
  const hasElectionEnded = new Date() > new Date(selectedElection.electionPeriod.end);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-border p-8">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-[#6B21E8]" />
            Election Results
          </h1>
          
          {pastElections.length > 1 && (
            <Tabs 
              defaultValue={selectedElection.id}
              className="mt-6"
              onValueChange={(value) => {
                const election = pastElections.find(e => e.id === value);
                if (election) setSelectedElection(election);
              }}
            >
              <TabsList className="mx-auto">
                {pastElections.map((election) => (
                  <TabsTrigger
                    key={election.id}
                    value={election.id}
                    className="data-[state=active]:bg-[#6B21E8] data-[state=active]:text-white"
                  >
                    {election.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Election Period: {new Date(selectedElection.electionPeriod.start).toLocaleDateString()} - {new Date(selectedElection.electionPeriod.end).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {totalVotes.toLocaleString()} votes cast
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-8">
        {/* Winner Announcement */}
        {winner && hasElectionEnded ? (
          <Card className="border-2 border-[#6B21E8] bg-gradient-to-r from-[#6B21E8]/10 to-green/10">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8 text-[#6B21E8]" />
              Winner Declared
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-6xl mb-4">{winner.symbol}</div>
            <h2 className="text-2xl font-bold mb-2">{winner.name}</h2>
            <p className="text-lg text-muted-foreground mb-4">{winner.party}</p>
            <div className="flex items-center justify-center gap-4">
                <div className="text-3xl font-bold text-[#6B21E8]">
                {winner.votes.toLocaleString()}
              </div>
              <div className="text-xl text-muted-foreground">
                ({winner.percentage}% of votes)
              </div>
            </div>
          </CardContent>
        </Card>
        ) : (
          <Card className="text-center p-8">
            <CardContent>
              <Clock className="h-12 w-12 text-[#6B21E8]/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {selectedElection.candidates.length === 0 
                  ? "No Candidates"
                  : isElectionLive 
                    ? "Election in Progress"
                    : "Election Not Started"}
              </h3>
              <p className="text-muted-foreground">
                {selectedElection.candidates.length === 0 
                  ? "No candidates have been added to this election."
                  : isElectionLive
                    ? "The election is currently in progress. Results will be declared after voting ends."
                    : "The election has not started yet. Check back when voting begins."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes Cast</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVotes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Out of {totalRegistered.toLocaleString()} registered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voter Turnout</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turnoutPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Participated in voting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Did Not Vote</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notVoted.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {notVotedPercentage.toFixed(1)}% of registered voters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidates</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedElection.candidates.length}</div>
              <p className="text-xs text-muted-foreground">
                Participating in election
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Candidate-wise Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedElection.candidates
                .sort((a, b) => b.votes - a.votes)
                .map((candidate, index) => (
                  <div key={candidate.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 flex items-center justify-center bg-[#6B21E8]/10 rounded-full">
                            <span className="text-[#6B21E8]">{candidate.symbol}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {index === 0 && <Trophy className="h-4 w-4 text-[#6B21E8]" />}
                              <span className="font-semibold">{candidate.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{candidate.party}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">{candidate.votes.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{candidate.percentage}%</div>
                      </div>
                    </div>
                    <Progress value={candidate.percentage} className="h-3" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Voting Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Turnout Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Voted ({turnoutPercentage.toFixed(1)}%)</span>
                    <span>{totalVotes.toLocaleString()}</span>
                  </div>
                  <Progress value={turnoutPercentage} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Did Not Vote ({notVotedPercentage.toFixed(1)}%)</span>
                    <span>{notVoted.toLocaleString()}</span>
                  </div>
                  <Progress value={notVotedPercentage} className="h-2 bg-red-100" />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    <strong>Total Registered:</strong> {totalRegistered.toLocaleString()} voters
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vote Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Merkle Root Hash</Label>
                <div className="bg-muted p-3 rounded font-mono text-xs break-all mt-1">
                  {selectedElection.merkleRoot}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Election Start</Label>
                  <div className="text-muted-foreground">
                    {new Date(selectedElection.electionPeriod.start).toLocaleString()}
                  </div>
                </div>
                <div>
                  <Label className="font-medium">Election End</Label>
                  <div className="text-muted-foreground">
                    {new Date(selectedElection.electionPeriod.end).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm">
                  ✓ All votes have been verified and counted using Merkle tree verification. 
                  Results are stored securely in our database.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Election Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Voting Process</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• MetaMask wallet authentication</li>
                  <li>• Vote encryption</li>
                  <li>• One vote per registered user</li>
                  <li>• Vote receipts with proofs</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Security Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Secure database storage</li>
                  <li>• Merkle tree verification</li>
                  <li>• Vote integrity checks</li>
                  <li>• Audit logging</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Transparency</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Real-time vote counting</li>
                  <li>• Vote verification tools</li>
                  <li>• Result validation</li>
                  <li>• Database backups</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-sm font-medium ${className}`}>{children}</div>
);

export default Results;
