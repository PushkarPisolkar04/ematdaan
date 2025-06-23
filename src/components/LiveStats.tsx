import { useState, useEffect } from 'react';
import { Users, Vote, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/lib/supabase';

interface LiveStatsProps {
  electionId: string;
}

interface Stats {
  totalVoters: number;
  votedCount: number;
  remainingCount: number;
  turnoutPercentage: number;
  candidateStats: Array<{
    id: string;
    name: string;
    party: string;
    symbol: string;
    votes: number;
    percentage: number;
  }>;
}

const LiveStats = ({ electionId }: LiveStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalVoters: 0,
    votedCount: 0,
    remainingCount: 0,
    turnoutPercentage: 0,
    candidateStats: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get number of registered users
        const { count: totalVoters, error: usersError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
        if (usersError) throw usersError;

        // Get number of votes for this election
        const { count: votedCount, error: votesError } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('election_id', electionId);
        if (votesError) throw votesError;

        const remainingCount = Math.max(0, (totalVoters || 0) - (votedCount || 0));
        const turnoutPercentage = (totalVoters || 0) > 0 ? ((votedCount || 0) / (totalVoters || 1)) * 100 : 0;

        // Get candidate stats (live count from votes table)
        const { data: candidates, error: candidatesError } = await supabase
          .from('candidates')
          .select('id, name, party, symbol, election_id')
          .eq('election_id', electionId);
        if (candidatesError) throw candidatesError;

        // For each candidate, count votes
        const candidateStats = await Promise.all(
          (candidates || []).map(async (candidate) => {
            const { count: candidateVotes } = await supabase
              .from('votes')
              .select('id', { count: 'exact', head: true })
              .eq('election_id', electionId)
              .eq('candidate_id', candidate.id);
            return {
              ...candidate,
              votes: candidateVotes || 0,
              percentage: (votedCount || 0) > 0 ? ((candidateVotes || 0) / (votedCount || 1)) * 100 : 0
            };
          })
        );

        setStats({
          totalVoters: totalVoters || 0,
          votedCount: votedCount || 0,
          remainingCount,
          turnoutPercentage,
          candidateStats
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [electionId]);

  return (
    <div className="space-y-6">
      {/* Voter Turnout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#6B21E8]" />
            Voter Turnout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.votedCount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Votes Cast</div>
        </div>
        <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.remainingCount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Remaining</div>
        </div>
      </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Turnout</span>
              <span>{stats.turnoutPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={stats.turnoutPercentage} className="h-2" />
          </div>

          <div className="p-4 bg-[#6B21E8]/5 border border-[#6B21E8]/10 rounded-lg">
            <div className="text-sm text-[#6B21E8] mb-1">Total Registered Voters</div>
            <div className="text-2xl font-bold text-[#6B21E8]">
              {stats.totalVoters.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-[#6B21E8]" />
            Candidate Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.candidateStats.map((candidate) => (
              <div key={candidate.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{candidate.symbol}</span>
                    <div>
                      <div className="font-medium">{candidate.name}</div>
                      <div className="text-sm text-muted-foreground">{candidate.party}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{candidate.votes.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{candidate.percentage.toFixed(1)}%</div>
        </div>
      </div>
                <Progress value={candidate.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveStats;
