import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { electionApi } from '@/lib/electionApi';
import { supabase, votingApi } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { formatTimeRemaining } from '@/lib/utils';
import { 
  Loader2, 
  Vote, 
  Trophy, 
  Clock, 
  AlertCircle, 
  Users, 
  Calendar,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  candidates_count?: number;
  total_votes?: number;
}

interface ElectionStats {
  totalElections: number;
  activeElections: number;
  completedElections: number;
  upcomingElections: number;
  totalVotes: number;
  totalCandidates: number;
}

const ElectionsList: React.FC = () => {
  const { user, organization, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<ElectionStats>({
    totalElections: 0,
    activeElections: 0,
    completedElections: 0,
    upcomingElections: 0,
    totalVotes: 0,
    totalCandidates: 0
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchElections = async () => {
      try {
        if (!organization?.id) {
          setElections([]);
          return;
        }

        const data = await electionApi.getElections(organization.id);
        
        const enhancedElections = await Promise.all(
          (data || []).map(async (election) => {
            let totalVotes = 0;
            try {
              const voteResults = await votingApi.getVoteResults(election.id);
              totalVotes = voteResults.reduce((total: number, result: any) => total + (result as any).votes, 0);
            } catch (error) {
              console.error(`Failed to get vote count for election ${election.id}:`, error);
            }

            return {
              ...election,
              candidates_count: election.candidates?.length || 0,
              total_votes: totalVotes
            };
          })
        );

        setElections(enhancedElections);
        calculateStats(enhancedElections);
      } catch (error) {
        console.error('Failed to fetch elections:', error);
        setElections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, [isAuthenticated, organization, navigate]);

  const calculateStats = (electionsData: Election[]) => {
    const now = new Date();
    let activeCount = 0;
    let completedCount = 0;
    let upcomingCount = 0;
    let totalVotes = 0;
    let totalCandidates = 0;

    electionsData.forEach(election => {
      const startTime = new Date(election.start_time);
      const endTime = new Date(election.end_time);
      
      if (now >= startTime && now <= endTime && election.is_active) {
        activeCount++;
      } else if (now > endTime) {
        completedCount++;
      } else {
        upcomingCount++;
      }

      totalVotes += election.total_votes || 0;
      totalCandidates += election.candidates_count || 0;
    });

    setStats({
      totalElections: electionsData.length,
      activeElections: activeCount,
      completedElections: completedCount,
      upcomingElections: upcomingCount,
      totalVotes,
      totalCandidates
    });
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);
    
    if (now < startTime) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200' };
    } else if (now > endTime) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200' };
    } else if (election.is_active) {
      return { status: 'active', label: 'Active', color: 'bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200' };
    } else {
      return { status: 'inactive', label: 'Inactive', color: 'bg-red-600 text-white hover:bg-red-700 transition-colors duration-200' };
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

  const activeElections = elections.filter(election => {
    const status = getElectionStatus(election);
    return status.status === 'active';
  });

  const upcomingElections = elections.filter(election => {
    const status = getElectionStatus(election);
    return status.status === 'upcoming';
  });

  const completedElections = elections.filter(election => {
    const status = getElectionStatus(election);
    return status.status === 'completed';
  });

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Elections</h1>
          <p className="text-xl text-gray-600">Manage and monitor all elections in your organization</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Total</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.totalElections}</p>
                  <p className="text-xs text-purple-600 mt-1">All elections</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Active</p>
                  <p className="text-3xl font-bold text-green-900">{stats.activeElections}</p>
                  <p className="text-xs text-green-600 mt-1">Currently running</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Vote className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 uppercase tracking-wide">Upcoming</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.upcomingElections}</p>
                  <p className="text-xs text-blue-600 mt-1">Scheduled soon</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 uppercase tracking-wide">Completed</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.completedElections}</p>
                  <p className="text-xs text-orange-600 mt-1">Finished elections</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Trophy className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          {activeElections.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900">Active Elections</h2>
                  <Badge className="bg-purple-100 text-purple-800">
                    {activeElections.length} ongoing
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Vote now in these active elections</span>
                </div>
              </div>

              <div className="space-y-6">
                {activeElections.map((election) => {
                  const status = getElectionStatus(election);
                  const participationRate = stats.totalCandidates > 0 ? 
                    ((election.total_votes || 0) / (election.candidates_count || 1)) * 100 : 0;
                  const timeRemaining = formatTimeRemaining(election.start_time, election.end_time);

                  return (
                    <Card key={election.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <CardTitle className="text-xl text-gray-900">{election.name}</CardTitle>
                              <Badge className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                            </div>
                            <CardDescription className="text-sm text-gray-600 mb-3">
                              {formatDateTime(election.start_time)} - {formatDateTime(election.end_time)}
                            </CardDescription>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>⏰ {timeRemaining}</span>
                              {election.total_votes > 0 && (
                                <span>🗳️ {election.total_votes} votes cast</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className="bg-purple-100 border border-purple-200 rounded-lg px-3 py-2 text-center">
                              <div className="text-lg font-bold text-purple-700">{election.candidates_count || 0}</div>
                              <div className="text-xs text-purple-600 font-medium">Candidates</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-800">Voting in Progress</span>
                              <span className="text-xs text-green-600">{timeRemaining}</span>
                            </div>
                            <Progress value={participationRate} className="h-2 bg-green-100" />
                            <p className="text-xs text-green-600 mt-1">
                              {election.total_votes || 0} votes cast • {Math.round(participationRate)}% participation
                            </p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button 
                              onClick={() => navigate(`/vote/${election.id}`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              <Vote className="w-4 h-4 mr-2" />
                              Vote Now
                            </Button>
                            <Button 
                              onClick={() => navigate(`/results/${election.id}`)}
                              variant="outline"
                              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              <Trophy className="w-4 h-4 mr-2" />
                              View Results
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {upcomingElections.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900">Upcoming Elections</h2>
                  <Badge className="bg-blue-100 text-blue-800">
                    {upcomingElections.length} scheduled
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                {upcomingElections.map((election) => {
                  const status = getElectionStatus(election);
                  const timeRemaining = formatTimeRemaining(election.start_time, election.end_time);

                  return (
                    <Card key={election.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <CardTitle className="text-xl text-gray-900">{election.name}</CardTitle>
                              <Badge className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                            </div>
                            <CardDescription className="text-sm text-gray-600 mb-3">
                              {formatDateTime(election.start_time)} - {formatDateTime(election.end_time)}
                            </CardDescription>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>⏰ {timeRemaining}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className="bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 text-center">
                              <div className="text-lg font-bold text-blue-700">{election.candidates_count || 0}</div>
                              <div className="text-xs text-blue-600 font-medium">Candidates</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-800">Election Starting Soon</span>
                              <span className="text-xs text-blue-600">{timeRemaining}</span>
                            </div>
                            <p className="text-xs text-blue-600">
                              {election.candidates_count || 0} candidates ready • Get ready to vote!
                            </p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button 
                              variant="outline"
                              disabled
                              className="flex-1 border-gray-300 text-gray-500"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Coming Soon
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completedElections.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-900">Completed Elections</h2>
                  <Badge className="bg-gray-100 text-gray-800">
                    {completedElections.length} finished
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                {completedElections.map((election) => {
                  const status = getElectionStatus(election);
                  const participationRate = stats.totalCandidates > 0 ? 
                    ((election.total_votes || 0) / (election.candidates_count || 1)) * 100 : 0;

                  return (
                    <Card key={election.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <CardTitle className="text-xl text-gray-900">{election.name}</CardTitle>
                              <Badge className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                            </div>
                            <CardDescription className="text-sm text-gray-600 mb-3">
                              {formatDateTime(election.start_time)} - {formatDateTime(election.end_time)}
                            </CardDescription>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>✅ Election ended</span>
                              {election.total_votes > 0 && (
                                <span>🗳️ {election.total_votes} votes cast</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-center">
                              <div className="text-lg font-bold text-gray-700">{election.candidates_count || 0}</div>
                              <div className="text-xs text-gray-600 font-medium">Candidates</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-800">Election Completed</span>
                              <span className="text-xs text-gray-600">Final results available</span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {election.total_votes || 0} total votes • {Math.round(participationRate)}% participation
                            </p>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button 
                              onClick={() => navigate(`/results/${election.id}`)}
                              variant="outline"
                              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              <Trophy className="w-4 h-4 mr-2" />
                              View Results
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
    
          {elections.length === 0 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Elections Found</h3>
                <p className="text-gray-600 mb-6">
                  There are no elections available in your organization yet.
                </p>
                <Button onClick={() => navigate('/dashboard')} className="bg-purple-600 hover:bg-purple-700">
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectionsList; 