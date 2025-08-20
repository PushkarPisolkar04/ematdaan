import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { electionApi } from '@/lib/electionApi';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
        
        // Enhance elections with additional data
        const enhancedElections = await Promise.all(
          (data || []).map(async (election) => {
            // Get candidates count
            const { count: candidatesCount } = await supabase
              .from('candidates')
              .select('*', { count: 'exact', head: true })
              .eq('election_id', election.id);

            // Get total votes
            const { count: totalVotes } = await supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('election_id', election.id);

            return {
              ...election,
              candidates_count: candidatesCount || 0,
              total_votes: totalVotes || 0
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Elections Overview</h1>
          <p className="text-xl text-gray-600">Manage and monitor all elections in your organization</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Total Elections</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalElections}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                  <p className="text-2xl font-bold text-green-900">{stats.activeElections}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Vote className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.upcomingElections}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Completed</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.completedElections}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Election Statistics</h3>
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Votes Cast</span>
                  <span className="font-semibold text-gray-900">{stats.totalVotes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Candidates</span>
                  <span className="font-semibold text-gray-900">{stats.totalCandidates}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Candidates per Election</span>
                  <span className="font-semibold text-gray-900">
                    {stats.totalElections > 0 ? (stats.totalCandidates / stats.totalElections).toFixed(1) : '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Voter Turnout</span>
                  <span className="font-semibold text-gray-900">
                    {stats.totalElections > 0 ? Math.round((stats.totalVotes / stats.totalElections)) : '0'} votes/election
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Election Status Overview</h3>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Elections</span>
                  <Badge className="bg-green-100 text-green-800">
                    {stats.activeElections}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Upcoming Elections</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {stats.upcomingElections}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed Elections</span>
                  <Badge className="bg-orange-100 text-orange-800">
                    {stats.completedElections}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-semibold text-gray-900">
                    {stats.totalElections > 0 ? Math.round((stats.completedElections / stats.totalElections) * 100) : '0'}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Elections List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Elections</h2>
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Click on an election to view details</span>
            </div>
          </div>

          {elections.length === 0 ? (
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
          ) : (
            <div className="space-y-6">
              {elections.map((election) => {
                const status = getElectionStatus(election);
                const participationRate = stats.totalCandidates > 0 ? 
                  ((election.total_votes || 0) / (election.candidates_count || 1)) * 100 : 0;
                const timeRemaining = () => {
                  const now = new Date();
                  const startTime = new Date(election.start_time);
                  const endTime = new Date(election.end_time);
                  
                  if (now < startTime) {
                    const diff = startTime.getTime() - now.getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    return `${days}d ${hours}h until start`;
                  } else if (now <= endTime) {
                    const diff = endTime.getTime() - now.getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    return `${days}d ${hours}h remaining`;
                  } else {
                    return 'Election ended';
                  }
                };

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
                            <span>⏰ {timeRemaining()}</span>
                            {election.candidates_count > 0 && (
                              <span>👥 {election.candidates_count} candidates</span>
                            )}
                            {election.total_votes > 0 && (
                              <span>🗳️ {election.total_votes} votes cast</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Election Progress */}
                        {status.status === 'active' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-800">Voting in Progress</span>
                              <span className="text-xs text-green-600">{timeRemaining()}</span>
                            </div>
                            <Progress value={participationRate} className="h-2 bg-green-100" />
                            <p className="text-xs text-green-600 mt-1">
                              {election.total_votes || 0} votes cast • {Math.round(participationRate)}% participation
                            </p>
                          </div>
                        )}

                        {status.status === 'upcoming' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-800">Election Starting Soon</span>
                              <span className="text-xs text-blue-600">{timeRemaining()}</span>
                            </div>
                            <p className="text-xs text-blue-600">
                              {election.candidates_count || 0} candidates ready • Get ready to vote!
                            </p>
                          </div>
                        )}

                        {status.status === 'completed' && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-800">Election Completed</span>
                              <span className="text-xs text-gray-600">Final results available</span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {election.total_votes || 0} total votes • {Math.round(participationRate)}% participation
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                          {status.status === 'active' && (
                            <Button 
                              onClick={() => navigate(`/vote/${election.id}`)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              <Vote className="w-4 h-4 mr-2" />
                              Vote Now
                            </Button>
                          )}
                          {(status.status === 'completed' || status.status === 'active') && (
                            <Button 
                              onClick={() => navigate(`/results/${election.id}`)}
                              variant="outline"
                              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              <Trophy className="w-4 h-4 mr-2" />
                              View Results
                            </Button>
                          )}
                          {status.status === 'upcoming' && (
                            <Button 
                              variant="outline"
                              disabled
                              className="flex-1 border-gray-300 text-gray-500"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectionsList; 