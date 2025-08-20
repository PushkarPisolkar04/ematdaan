import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeRemaining } from '@/lib/utils';
import { 
  Vote, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  User,
  Calendar,
  BarChart3,
  Info,
  Target,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { supabase, votingApi } from '@/lib/supabase';
import { fetchPlatformStats, PlatformStats } from '@/lib/api/stats';
import { electionApi } from '@/lib/electionApi';

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  total_votes: number;
  candidates_count: number;
  has_voted: boolean;
}

interface UserStats {
  totalElections: number;
  participatedElections: number;
  upcomingElections: number;
  activeElections: number;
  totalVotes: number;
  totalUsers: number;
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalElections: 0,
    participatedElections: 0,
    upcomingElections: 0,
    activeElections: 0,
    totalVotes: 0,
    totalUsers: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, organization, userRole, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    
    // Redirect admins to admin panel
    if (userRole === 'admin') {
      navigate('/admin');
      return;
    }
    
    loadDashboardData();
  }, [isAuthenticated, user, organization, userRole]);

  // Recalculate stats when elections or platform stats change
  useEffect(() => {
    if (elections.length > 0 || platformStats) {
      loadStats();
    }
  }, [elections, platformStats]);

  // Refresh data when component comes into focus (e.g., after voting)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && organization && user) {
        loadDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, organization, user]);

  const loadDashboardData = async () => {
    if (!user || !organization) return;
    
    try {
      setIsLoading(true);
      await Promise.all([
        loadElections(),
        loadPlatformStats()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlatformStats = async () => {
    try {
      const stats = await fetchPlatformStats();
      setPlatformStats(stats);
    } catch (error) {
      console.error('Failed to load platform stats:', error);
      // Don't throw error, continue with local stats
    }
  };

  const loadElections = async () => {
    try {
      // Use the same API as admin dashboard
      const electionsData = await electionApi.getElections(organization?.id);
      
      // Check which elections the user has voted in using server API
      const votedElectionIds = new Set();
      
      // Check voting status for each election
      for (const election of electionsData || []) {
        try {
          const hasVoted = await votingApi.hasVoted(user.id, election.id);
          if (hasVoted) {
            votedElectionIds.add(election.id);
          }
        } catch (error) {
          console.error(`Failed to check voting status for election ${election.id}:`, error);
        }
      }

      const processedElections = (electionsData || []).map(election => ({
        id: election.id,
        name: election.name,
        start_time: election.start_time,
        end_time: election.end_time,
        is_active: election.is_active,
        total_votes: 0, // Will be calculated separately if needed
        candidates_count: election.candidates?.length || 0,
        has_voted: votedElectionIds.has(election.id)
      }));

      setElections(processedElections);
    } catch (error) {
      console.error('Failed to load elections:', error);
      throw error;
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date();
      
      // Calculate stats from the elections data
      const totalElections = elections.length;
      const participatedElections = elections.filter(e => e.has_voted).length;
      const activeElections = elections.filter(e => {
        const startTime = new Date(e.start_time);
        const endTime = new Date(e.end_time);
        return e.is_active && now >= startTime && now <= endTime;
      }).length;
      const upcomingElections = elections.filter(e => {
        const startTime = new Date(e.start_time);
        return now < startTime;
      }).length;

      setStats({
        totalElections,
        participatedElections,
        upcomingElections,
        activeElections,
        totalVotes: platformStats?.totalVotes || 0,
        totalUsers: platformStats?.totalUsers || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      throw error;
    }
  };

  const handleVote = (electionId: string) => {
    navigate(`/vote/${electionId}`);
  };

  const handleViewResults = (electionId: string) => {
    navigate(`/results/${electionId}`);
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    // Get current time in IST
    const nowIST = new Date();
    const startTimeIST = new Date(election.start_time);
    const endTimeIST = new Date(election.end_time);

    // If current time is before start time, it's upcoming
    if (nowIST < startTimeIST) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200' };
    } 
    // If current time is after end time, it's ended
    else if (nowIST > endTimeIST) {
      return { status: 'ended', label: 'Ended', color: 'bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200' };
    }
    // If current time is between start and end, check if it's active
    else if (election.is_active) {
      return { status: 'active', label: 'Active', color: 'bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200' };
    }
    // Otherwise it's inactive
    else {
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

  // Separate elections by status
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
    return status.status === 'ended';
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600">
                {organization?.name} • {userRole === 'admin' ? 'Administrator' : 'Student'}
              </p>
            </div>
            <Button
              onClick={() => loadDashboardData()}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Total Elections</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.totalElections}</p>
                  <p className="text-xs text-purple-600 mt-1">Available to you</p>
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
                  <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Participated</p>
                  <p className="text-3xl font-bold text-green-900">{stats.participatedElections}</p>
                  <p className="text-xs text-green-600 mt-1">Elections voted in</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 uppercase tracking-wide">Active</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.activeElections}</p>
                  <p className="text-xs text-orange-600 mt-1">Currently running</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Vote className="h-8 w-8 text-orange-600" />
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
        </div>

        {/* Elections Section */}
        <div className="space-y-6">
          {/* Active Elections Section */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeElections.map((election) => {
                  const status = getElectionStatus(election);
                  const timeRemaining = formatTimeRemaining(election.start_time, election.end_time);
                  return (
                    <Card 
                      key={election.id} 
                      className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        if (!election.has_voted) {
                          handleVote(election.id);
                        } else {
                          handleViewResults(election.id);
                        }
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-gray-900">{election.name}</CardTitle>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-600">
                          {election.candidates_count} candidates
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Start:</span>
                            <span className="text-gray-900">
                              {formatDateTime(election.start_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">End:</span>
                            <span className="text-gray-900">
                              {formatDateTime(election.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Time Left:</span>
                            <span className="text-purple-600 font-medium">{timeRemaining}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Status:</span>
                            <div className="flex items-center space-x-2">
                              {election.has_voted && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              <span className={election.has_voted ? 'text-green-600' : 'text-gray-900'}>
                                {election.has_voted ? 'Voted' : 'Not Voted'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <Button 
                            className="w-full"
                            variant={!election.has_voted ? 'default' : 'outline'}
                            disabled={election.has_voted}
                            onClick={() => {
                              if (!election.has_voted) {
                                handleVote(election.id);
                              } else {
                                handleViewResults(election.id);
                              }
                            }}
                          >
                            {!election.has_voted ? (
                              <>
                                <Vote className="h-4 w-4 mr-2" />
                                Vote Now
                              </>
                            ) : (
                              <>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Results
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Elections Section */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingElections.map((election) => {
                  const status = getElectionStatus(election);
                  return (
                    <Card 
                      key={election.id} 
                      className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      onClick={() => handleViewResults(election.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-gray-900">{election.name}</CardTitle>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-600">
                          {election.candidates_count} candidates
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Start:</span>
                            <span className="text-gray-900">
                              {formatDateTime(election.start_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">End:</span>
                            <span className="text-gray-900">
                              {formatDateTime(election.end_time)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <Button 
                            variant="outline"
                            disabled
                            className="w-full border-gray-300 text-gray-500"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Coming Soon
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Elections Section */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedElections.map((election) => {
                  const status = getElectionStatus(election);
                  return (
                    <Card 
                      key={election.id} 
                      className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      onClick={() => handleViewResults(election.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-gray-900">{election.name}</CardTitle>
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-600">
                          {election.candidates_count} candidates
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Start:</span>
                            <span className="text-gray-900">
                              {formatDateTime(election.start_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">End:</span>
                            <span className="text-gray-900">
                              {formatDateTime(election.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Status:</span>
                            <div className="flex items-center space-x-2">
                              {election.has_voted && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              <span className={election.has_voted ? 'text-green-600' : 'text-gray-900'}>
                                {election.has_voted ? 'Voted' : 'Not Voted'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <Button 
                            variant="outline"
                            className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                            onClick={() => handleViewResults(election.id)}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Results
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Elections Message */}
          {elections.length === 0 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections Available</h3>
                <p className="text-gray-600 mb-4">
                  There are currently no elections available for your organization.
                </p>
                <Button variant="outline" onClick={() => loadDashboardData()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
