import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalElections: 0,
    participatedElections: 0,
    upcomingElections: 0,
    activeElections: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, organization, userRole, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, user, organization]);

  const loadDashboardData = async () => {
    if (!user || !organization) return;
    
    try {
      setIsLoading(true);
      await loadElections();
      await loadStats();
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

  const loadElections = async () => {
    try {
      const { data: electionsData, error } = await supabase
        .from('elections')
        .select(`
          id,
          name,
          start_time,
          end_time,
          is_active,
          candidates (id)
        `)
        .eq('organization_id', organization?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Check which elections the user has voted in
      const { data: userVotes, error: votesError } = await supabase
        .from('votes')
        .select('election_id')
        .eq('user_id', user?.id);

      if (votesError) throw votesError;

      const votedElectionIds = new Set(userVotes?.map(vote => vote.election_id) || []);

      const processedElections = electionsData?.map(election => ({
        id: election.id,
        name: election.name,
        start_time: election.start_time,
        end_time: election.end_time,
        is_active: election.is_active,
        total_votes: 0, // Will be calculated separately
        candidates_count: election.candidates?.length || 0,
        has_voted: votedElectionIds.has(election.id)
      })) || [];

      setElections(processedElections);
    } catch (error) {
      console.error('Failed to load elections:', error);
      throw error;
    }
  };

  const loadStats = async () => {
    try {
      const now = new Date().toISOString();
      
      const totalElections = elections.length;
      const participatedElections = elections.filter(e => e.has_voted).length;
      const activeElections = elections.filter(e => 
        e.is_active && new Date(e.start_time) <= new Date(now) && new Date(e.end_time) >= new Date(now)
      ).length;
      const upcomingElections = elections.filter(e => 
        new Date(e.start_time) > new Date(now)
      ).length;

      setStats({
        totalElections,
        participatedElections,
        upcomingElections,
        activeElections
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

    if (now < startTime) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'ended', label: 'Ended', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600">
            {organization?.name} • {userRole === 'admin' ? 'Administrator' : 'Student'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Elections</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalElections}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Participated</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.participatedElections}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeElections}</p>
                </div>
                <Vote className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcomingElections}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Elections Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Elections</h2>
            {userRole === 'admin' && (
              <Button onClick={() => navigate('/admin')}>
                Manage Elections
              </Button>
            )}
          </div>

          {elections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections Found</h3>
                <p className="text-gray-600 mb-4">
                  {userRole === 'admin' 
                    ? 'Create your first election to get started.'
                    : 'No elections are currently available.'
                  }
                </p>
                {userRole === 'admin' && (
                  <Button onClick={() => navigate('/admin')}>
                    Create Election
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.map((election) => {
                const status = getElectionStatus(election);
                const isActive = status.status === 'active';
                const canVote = isActive && !election.has_voted && userRole === 'student';
                const hasEnded = status.status === 'ended';

                return (
                  <Card key={election.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{election.name}</CardTitle>
                          <CardDescription>
                            {election.candidates_count} candidates
                          </CardDescription>
                        </div>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Start: {new Date(election.start_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>End: {new Date(election.end_time).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {election.has_voted && (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span>You have voted</span>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {canVote && (
                          <Button 
                            onClick={() => handleVote(election.id)}
                            className="flex-1"
                          >
                            <Vote className="h-4 w-4 mr-2" />
                            Vote Now
                          </Button>
                        )}
                        
                        {hasEnded && (
                          <Button 
                            variant="outline"
                            onClick={() => handleViewResults(election.id)}
                            className="flex-1"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Results
                          </Button>
                        )}

                        {election.has_voted && !hasEnded && (
                          <Button 
                            variant="outline"
                            className="flex-1"
                            disabled
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Already Voted
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {userRole === 'admin' && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your organization and elections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/admin')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Calendar className="h-6 w-6" />
                    <span>Manage Elections</span>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/admin?tab=members')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <User className="h-6 w-6" />
                    <span>Manage Members</span>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/admin?tab=results')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span>View Results</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
