import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { validateSession } from '@/lib/api/traditionalAuth';
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
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalElections: 0,
    participatedElections: 0,
    upcomingElections: 0,
    activeElections: 0
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        navigate('/auth');
        return;
      }

      const session = await validateSession(sessionToken);
      if (!session) {
        localStorage.clear();
        navigate('/auth');
        return;
      }

      const organizationId = localStorage.getItem('organization_id');
      if (!organizationId) {
        navigate('/auth');
        return;
      }

      setUser(session);
      await loadOrganizationData(organizationId);
      await loadElections(organizationId, session.user_id);
      await loadStats(organizationId, session.user_id);
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizationData = async (organizationId: string) => {
    try {
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      setOrganization(org);
    } catch (error) {
      console.error('Failed to load organization:', error);
    }
  };

  const loadElections = async (organizationId: string, userId: string) => {
    try {
      // Get all elections for the organization
      const { data: electionsData, error: electionsError } = await supabase
        .from('elections')
        .select(`
          id,
          name,
          start_time,
          end_time,
          is_active,
          total_votes,
          candidates(count)
        `)
        .eq('organization_id', organizationId)
        .order('start_time', { ascending: false });

      if (electionsError) throw electionsError;

      // Get user's voting history
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('election_id')
        .eq('organization_id', organizationId)
        .eq('voter_id', userId);

      if (votesError) throw votesError;

      const votedElectionIds = new Set(votesData?.map(vote => vote.election_id) || []);

      // Combine election data with voting status
      const electionsWithVoteStatus = electionsData?.map(election => ({
        ...election,
        candidates_count: election.candidates?.[0]?.count || 0,
        has_voted: votedElectionIds.has(election.id)
      })) || [];

      setElections(electionsWithVoteStatus);
    } catch (error) {
      console.error('Failed to load elections:', error);
    }
  };

  const loadStats = async (organizationId: string, userId: string) => {
    try {
      // Get total elections
      const { count: totalElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get user's participated elections
      const { count: participatedElections } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('voter_id', userId);

      // Get upcoming elections
      const { count: upcomingElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gt('start_time', new Date().toISOString());

      // Get active elections
      const { count: activeElections } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .lte('start_time', new Date().toISOString())
        .gte('end_time', new Date().toISOString());

      setStats({
        totalElections: totalElections || 0,
        participatedElections: participatedElections || 0,
        upcomingElections: upcomingElections || 0,
        activeElections: activeElections || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return { status: 'upcoming', color: 'bg-yellow-500', text: 'Upcoming', icon: Clock };
    } else if (now >= startTime && now <= endTime && election.is_active) {
      return { status: 'active', color: 'bg-green-500', text: 'Active', icon: Vote };
    } else if (election.has_voted) {
      return { status: 'voted', color: 'bg-blue-500', text: 'Voted', icon: CheckCircle };
    } else {
      return { status: 'ended', color: 'bg-gray-500', text: 'Ended', icon: XCircle };
    }
  };

  const handleVote = (electionId: string) => {
    navigate(`/vote/${electionId}`);
  };

  const handleViewResults = (electionId: string) => {
    navigate(`/results/${electionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <Badge variant="secondary">
                {organization?.name}
              </Badge>
              <Badge variant="outline">
                {user.role === 'org_owner' ? 'Owner' : user.role}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              {user.role === 'org_owner' || user.role === 'admin' ? (
                <Button onClick={() => navigate('/admin')}>
                  Admin Panel
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => navigate('/profile')}>
                Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name || user.email}!
          </h2>
          <p className="text-gray-600">
            Here's what's happening in your organization
          </p>
        </div>

        {/* Voter Guidance Section */}
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl text-green-800">
              <Target className="h-6 w-6" />
              How to Vote
            </CardTitle>
            <CardDescription>
              Quick guide to participate in elections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 text-green-800">Voting Steps:</h4>
                <div className="space-y-1 text-xs">
                  <p>• Look for "Active" elections below</p>
                  <p>• Click "Vote Now" to participate</p>
                  <p>• Select your preferred candidate</p>
                  <p>• Submit and save your receipt</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2 text-blue-800">Status Guide:</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span><strong>Active:</strong> Voting open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span><strong>Upcoming:</strong> Starting soon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span><strong>Voted:</strong> Already participated</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Remember:</strong> You can only vote once per election. Save your receipt for verification.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Elections</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalElections}</div>
              <p className="text-xs text-muted-foreground">
                All time elections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participated</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.participatedElections}</div>
              <p className="text-xs text-muted-foreground">
                Elections you voted in
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingElections}</div>
              <p className="text-xs text-muted-foreground">
                Elections starting soon
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeElections}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Elections Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">Elections</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </div>

          {elections.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Elections Available</h4>
                <p className="text-gray-600 mb-4">
                  There are no elections available for voting at the moment.
                </p>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Check Back Later
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.map((election) => {
                const status = getElectionStatus(election);
                const StatusIcon = status.icon;

                return (
                  <Card key={election.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{election.name}</CardTitle>
                        <Badge 
                          variant={status.status === 'active' ? 'default' : 'secondary'}
                          className={status.color}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.text}
                        </Badge>
                      </div>
                      <CardDescription>
                        {election.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Start:</span>
                          <span>{new Date(election.start_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">End:</span>
                          <span>{new Date(election.end_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Candidates:</span>
                          <span>{election.candidates_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Votes:</span>
                          <span>{election.total_votes}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {status.status === 'active' && !election.has_voted && (
                          <Button 
                            onClick={() => handleVote(election.id)}
                            className="flex-1"
                          >
                            Vote Now
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                        
                        {status.status === 'voted' && (
                          <Button 
                            variant="outline"
                            onClick={() => handleViewResults(election.id)}
                            className="flex-1"
                          >
                            View Results
                          </Button>
                        )}
                        
                        {status.status === 'ended' && (
                          <Button 
                            variant="outline"
                            onClick={() => handleViewResults(election.id)}
                            className="flex-1"
                          >
                            View Results
                          </Button>
                        )}
                        
                        {status.status === 'upcoming' && (
                          <Button 
                            variant="outline"
                            disabled
                            className="flex-1"
                          >
                            Coming Soon
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
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>View Profile</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Voting History</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Election Calendar</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
