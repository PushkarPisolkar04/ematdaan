import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, votingApi } from '@/lib/supabase';
import { electionApi } from '@/lib/electionApi';
import { candidateApi } from '@/lib/candidateApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { Loader2, Trophy, Users, Vote, TrendingUp, AlertCircle } from 'lucide-react';

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
  description?: string;
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

      // Get election details using the API
      const election = await electionApi.getElection(electionId);

      if (!election) {
        throw new Error('Election not found');
      }

      // Verify the election belongs to the user's organization
      if (election.organization_id !== organization.id) {
        throw new Error('Election not found');
      }

      // Get candidates first using the API
      let candidates;
      try {
        const candidatesData = await candidateApi.getCandidates(electionId);
        candidates = candidatesData;
      } catch (apiError) {
        // Fallback to direct Supabase query
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select(`
            id,
            name,
            party,
            symbol
          `)
          .eq('election_id', electionId);

        if (candidatesError) {
          throw candidatesError;
        }
        candidates = candidatesData;
      }

      // Get vote results using server API
      const voteResults = await votingApi.getVoteResults(electionId);
      
      // Combine candidates with vote counts - ensure all candidates are included
      const candidatesWithVotes = candidates?.map(candidate => {
        const voteResult = voteResults.find((result: any) => result.candidate.id === candidate.id);
        return {
          ...candidate,
          vote_count: voteResult ? (voteResult as any).votes : 0
        };
      }) || [];

      // Calculate total votes
      const totalVotes = voteResults.reduce((total: number, result: any) => total + (result as any).votes, 0);

      // Get total eligible voters (organization members excluding admins)
      const { count: totalEligibleVoters, error: votersError } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .neq('role', 'admin');

      if (votersError) {
        throw votersError;
      }

      // Process candidates data
      const processedCandidates: Candidate[] = candidatesWithVotes.map(candidate => {
        const percentage = totalVotes ? (candidate.vote_count / totalVotes) * 100 : 0;
        
        return {
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          symbol: candidate.symbol,
          vote_count: candidate.vote_count,
          percentage: Math.round(percentage * 100) / 100
        };
      }).sort((a, b) => b.vote_count - a.vote_count);

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



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Results Not Found</h1>
          <Button onClick={() => navigate('/dashboard')} className="bg-purple-600 hover:bg-purple-700">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-600 text-white' };
    } else if (now > endTime) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-600 text-white' };
    } else if (election.is_active) {
      return { status: 'active', label: 'Active', color: 'bg-purple-600 text-white' };
    } else {
      return { status: 'inactive', label: 'Inactive', color: 'bg-red-600 text-white' };
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const electionStatus = getElectionStatus(results.election);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{results.election.name}</h1>
              <p className="text-lg text-gray-600 mb-3">
                {results.election.description || 'Election Results'}
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>Start: {formatDateTime(results.election.start_time)}</span>
                <span>End: {formatDateTime(results.election.end_time)}</span>
              </div>
            </div>
            <Badge className={`${electionStatus.color} text-base px-4 py-2`}>
              {electionStatus.label}
            </Badge>
          </div>

          {/* Enhanced Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Total Votes</p>
                    <p className="text-3xl font-bold text-purple-900">{results.totalVotes}</p>
                    <p className="text-xs text-purple-600 mt-1">Votes cast</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Vote className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Eligible Voters</p>
                    <p className="text-3xl font-bold text-green-900">{results.totalEligibleVoters}</p>
                    <p className="text-xs text-green-600 mt-1">Total members</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 uppercase tracking-wide">Participation</p>
                    <p className="text-3xl font-bold text-blue-900">{results.participationRate}%</p>
                    <p className="text-xs text-blue-600 mt-1">Voter turnout</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 uppercase tracking-wide">Candidates</p>
                    <p className="text-3xl font-bold text-orange-900">{results.candidates.length}</p>
                    <p className="text-xs text-orange-600 mt-1">Total candidates</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <Users className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Winner Announcement */}
        {winner && winner.vote_count > 0 && (
          <Card className="mb-8 border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-6">
                <div className="p-4 bg-yellow-100 rounded-full">
                  <Trophy className="h-16 w-16 text-yellow-600" />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{winner.name}</h2>
                  <p className="text-xl text-gray-600 mb-3">
                    {winner.vote_count} votes ({winner.percentage}%)
                  </p>
                  <Badge className="text-base bg-yellow-600 text-white px-4 py-2">
                    🏆 Winner
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Votes Message */}
        {results.totalVotes === 0 && (
          <Card className="mb-8 border-2 border-gray-200 bg-gray-50 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-6">
                <div className="p-4 bg-gray-100 rounded-full">
                  <AlertCircle className="h-16 w-16 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No Votes Cast Yet</h2>
                  <p className="text-lg text-gray-600">
                    This election has {results.candidates.length} candidates but no votes have been cast.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Results List */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-800">Election Results</CardTitle>
                <CardDescription className="text-base text-gray-600">
                  All candidates ranked by vote count
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {results.candidates.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Candidates</h3>
                    <p className="text-gray-600 text-base">No candidates have been added to this election yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {results.candidates.map((candidate, index) => (
                      <div key={candidate.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-base font-semibold ${
                              index === 0 && candidate.vote_count > 0 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                              {candidate.party && (
                                <p className="text-sm text-gray-500">{candidate.party}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">{candidate.vote_count} votes</p>
                            <p className="text-sm text-gray-500">{candidate.percentage}%</p>
                          </div>
                        </div>
                        <Progress 
                          value={candidate.percentage} 
                          className={`h-3 ${
                            index === 0 && candidate.vote_count > 0 
                              ? 'bg-yellow-100' 
                              : 'bg-gray-100'
                          }`}
                        />
                        {index < results.candidates.length - 1 && <Separator className="bg-gray-100" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics & Actions */}
          <div className="space-y-6">
            {/* Participation Stats */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-800">Participation Statistics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Votes Cast</span>
                      <span className="font-semibold text-gray-900">{results.totalVotes}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Eligible Voters</span>
                      <span className="font-semibold text-gray-900">{results.totalEligibleVoters}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Participation Rate</span>
                      <span className="font-semibold text-gray-900">{results.participationRate}%</span>
                    </div>
                    <Progress value={results.participationRate} className="h-3 mt-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
