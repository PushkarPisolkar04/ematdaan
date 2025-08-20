import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Download, Share2, Users, Vote, TrendingUp } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  party?: string;
  symbol?: string;
  vote_count: number;
  percentage: number;
}

interface Election {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  organization_id: string;
}

interface ResultsData {
  election: Election;
  candidates: Candidate[];
  totalVotes: number;
  totalEligibleVoters: number;
  participationRate: number;
}

const Results: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const { user, organization, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (electionId) {
      loadResults();
    }
  }, [isAuthenticated, electionId, user, organization]);

  const loadResults = async () => {
    if (!electionId || !organization) return;

    try {
      setLoading(true);

      // Get election details
      const { data: election, error: electionError } = await supabase
        .from('elections')
        .select('*')
        .eq('id', electionId)
        .eq('organization_id', organization.id)
        .single();

      if (electionError) {
        throw new Error('Election not found');
      }

      // Get candidates with vote counts
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select(`
          id,
          name,
          party,
          symbol,
          votes:votes(count)
        `)
        .eq('election_id', electionId);

      if (candidatesError) {
        throw candidatesError;
      }

      // Get total votes
      const { count: totalVotes, error: voteCountError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId);

      if (voteCountError) {
        throw voteCountError;
      }

      // Get total eligible voters (organization members)
      const { count: totalEligibleVoters, error: votersError } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (votersError) {
        throw votersError;
      }

      // Process candidates data
      const processedCandidates: Candidate[] = candidates?.map(candidate => {
        const voteCount = candidate.votes?.[0]?.count || 0;
        const percentage = totalVotes ? (voteCount / totalVotes) * 100 : 0;
        
        return {
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          symbol: candidate.symbol,
          vote_count: voteCount,
          percentage: Math.round(percentage * 100) / 100
        };
      }).sort((a, b) => b.vote_count - a.vote_count) || [];

      const participationRate = totalEligibleVoters ? (totalVotes / totalEligibleVoters) * 100 : 0;

      const resultsData: ResultsData = {
        election,
        candidates: processedCandidates,
        totalVotes: totalVotes || 0,
        totalEligibleVoters: totalEligibleVoters || 0,
        participationRate: Math.round(participationRate * 100) / 100
      };

      setResults(resultsData);
      setWinner(processedCandidates[0] || null);

    } catch (error) {
      console.error('Failed to load results:', error);
      toast({
        title: "Error",
        description: "Failed to load election results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "Feature Coming Soon",
      description: "PDF export functionality will be available soon"
    });
  };

  const handleExportCSV = () => {
    if (!results) return;

    const csvContent = [
      ['Candidate', 'Party', 'Votes', 'Percentage'],
      ...results.candidates.map(candidate => [
        candidate.name,
        candidate.party || 'Independent',
        candidate.vote_count.toString(),
        `${candidate.percentage}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${results.election.name}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Results exported to CSV file"
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${results?.election.name} Results`,
        text: `View the results for ${results?.election.name}`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied",
        description: "Results page link copied to clipboard"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Results Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{results.election.name}</h1>
            <p className="text-gray-600 mt-1">{results.election.description}</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Results Finalized
          </Badge>
        </div>

        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Vote className="h-4 w-4" />
            <span>{results.totalVotes} votes cast</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{results.totalEligibleVoters} eligible voters</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>{results.participationRate}% participation</span>
          </div>
        </div>
      </div>

      {/* Winner Announcement */}
      {winner && (
        <Card className="mb-8 border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-4">
              <Trophy className="h-12 w-12 text-yellow-600" />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">{winner.name}</h2>
                <p className="text-lg text-gray-600">
                  {winner.vote_count} votes ({winner.percentage}%)
                </p>
                <Badge className="mt-2 bg-yellow-600 text-white">
                  🏆 Winner
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Results List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Election Results</CardTitle>
              <CardDescription>
                All candidates ranked by vote count
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.candidates.map((candidate, index) => (
                <div key={candidate.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{candidate.name}</h3>
                        {candidate.party && (
                          <p className="text-sm text-gray-500">{candidate.party}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{candidate.vote_count} votes</p>
                      <p className="text-sm text-gray-500">{candidate.percentage}%</p>
                    </div>
                  </div>
                  <Progress value={candidate.percentage} className="h-2" />
                  {index < results.candidates.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Statistics & Actions */}
        <div className="space-y-6">
          {/* Participation Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Participation Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Votes Cast</span>
                  <span className="font-medium">{results.totalVotes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Eligible Voters</span>
                  <span className="font-medium">{results.totalEligibleVoters}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Participation Rate</span>
                  <span className="font-medium">{results.participationRate}%</span>
                </div>
                <Progress value={results.participationRate} className="h-2 mt-2" />
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export & Share</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={handleExportCSV} 
                variant="outline" 
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button 
                onClick={handleShare} 
                variant="outline" 
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Results
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
