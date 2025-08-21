import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeRemaining } from '@/lib/utils';
import { 
  Users, 
  Vote, 
  Plus, 
  Calendar,
  BarChart3,
  Mail,
  RefreshCw,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Settings,
  Download,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  Zap,
  Award,
  Globe,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase, candidateApi, votingApi } from '@/lib/supabase';
import { electionApi } from '@/lib/electionApi';


interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  candidates?: any[];
  total_votes?: number;
  candidates_count?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeElections: 0,
    totalVotes: 0,
    pendingInvitations: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, organization, userRole, isAuthenticated } = useAuth();

  const [newElection, setNewElection] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (userRole !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page",
        variant: "destructive"
      });
      navigate('/admin');
      return;
    }

    loadAdminData();
  }, [isAuthenticated, userRole, organization]);

  useEffect(() => {
    if ((users.length > 0 || elections.length > 0) && organization?.id) {
      loadStats(users, elections);
    }
  }, [users, elections, organization?.id]);

  const loadAdminData = async () => {
    if (!organization) return;
    
    try {
      setIsLoading(true);
      await Promise.all([
        loadElections(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadElections = async () => {
    try {
      const electionsData = await electionApi.getElections(organization?.id);
      
      const processedElections = await Promise.all((electionsData || []).map(async (election) => {
        let totalVotes = 0;
        try {
          const voteResults = await votingApi.getVoteResults(election.id);
          totalVotes = voteResults.reduce((total: number, result: any) => total + (result as any).votes, 0);
        } catch (error) {
          console.error(`Failed to get vote count for election ${election.id}:`, error);
        }

        return {
          ...election,
          total_votes: totalVotes,
          candidates_count: election.candidates?.length || 0
        };
      }));

      setElections(processedElections);
    } catch (error) {
      console.error('Failed to load elections:', error);
      throw error;
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          joined_at,
          is_active,
          auth_users (
            id,
            name,
            email,
            role
          )
        `)
        .eq('organization_id', organization?.id);

      if (error) throw error;

      const processedUsers = (data || []).map(userOrg => {
        const authUser = Array.isArray(userOrg.auth_users) ? userOrg.auth_users[0] : userOrg.auth_users;
        return {
          id: authUser?.id || '',
          name: authUser?.name || '',
          email: authUser?.email || '',
          role: authUser?.role || '',
          joined_at: userOrg.joined_at,
          is_active: userOrg.is_active
        };
      }).filter(user => user.id) as User[];

      setUsers(processedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      throw error;
    }
  };

  const loadStats = async (currentUsers: User[], currentElections: Election[]) => {
    try {
      setStatsLoading(true);
      
      const eligibleVoters = currentUsers.filter(user => user.role === 'student').length;
      const totalUsers = currentUsers.length;
      
      const now = new Date();
      const activeElections = currentElections.filter(e => {
        const startTime = new Date(e.start_time);
        const endTime = new Date(e.end_time);
        return e.is_active && now >= startTime && now <= endTime;
      }).length;
      
      const totalVotes = currentElections.reduce((sum, e) => sum + (e.total_votes || 0), 0);

      const { data: invitationStats } = await supabase.rpc('get_invitation_stats', {
        p_organization_id: organization?.id
      });
      
      const pendingInvitations = invitationStats?.[0]?.pending_invitations || 0;

      setStats({
        totalUsers: eligibleVoters,
        activeElections,
        totalVotes,
        pendingInvitations: pendingInvitations || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      throw error;
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newElection.name || !newElection.startDate || !newElection.endDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const startDateUTC = new Date(newElection.startDate).toISOString();
      const endDateUTC = new Date(newElection.endDate).toISOString();
      
      await electionApi.createElection({
        name: newElection.name,
        startTime: startDateUTC,
        endTime: endDateUTC,
        organizationId: organization?.id
      });

      toast({
        title: "Election Created",
        description: "Election has been created successfully"
      });

      setNewElection({
        name: '',
        startDate: '',
        endDate: '',
        description: ''
      });

      await loadElections();
    } catch (error) {
      console.error('Failed to create election:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create election",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleElectionStatus = async (electionId: string, currentStatus: boolean) => {
    try {
      await electionApi.updateElection(electionId, { isActive: !currentStatus });

      toast({
        title: "Status Updated",
        description: `Election ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      await loadElections();
    } catch (error) {
      console.error('Failed to toggle election status:', error);
      toast({
        title: "Error",
        description: "Failed to update election status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteElection = async (electionId: string) => {
    if (!confirm('Are you sure you want to delete this election? This action cannot be undone.')) {
      return;
    }

    try {
      await electionApi.deleteElection(electionId);
      toast({
        title: "Election Deleted",
        description: "Election has been deleted successfully"
      });
      await loadElections();
    } catch (error) {
      console.error('Failed to delete election:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete election",
        variant: "destructive"
      });
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

  const getElectionStatus = (election: any) => {
    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (now < startTime) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200' };
    } 
    else if (now > endTime) {
      return { status: 'ended', label: 'Ended', color: 'bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200' };
    }
    else if (election.is_active) {
      return { status: 'active', label: 'Active', color: 'bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200' };
    }
    else {
      return { status: 'inactive', label: 'Inactive', color: 'bg-red-600 text-white hover:bg-red-700 transition-colors duration-200' };
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">
                {organization?.name} • Manage elections, users, and platform settings
              </p>
            </div>
            <Button
              onClick={loadAdminData}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 uppercase tracking-wide">Total Users</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {statsLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin inline" />
                    ) : (
                      stats.totalUsers
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Active members</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 uppercase tracking-wide">Active Elections</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {statsLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin inline" />
                    ) : (
                      stats.activeElections
                    )}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Currently running</p>
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
                  <p className="text-sm font-medium text-green-700 uppercase tracking-wide">Total Votes</p>
                  <p className="text-3xl font-bold text-green-900">
                    {statsLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin inline" />
                    ) : (
                      stats.totalVotes
                    )}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Cast this period</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 uppercase tracking-wide">Pending Invites</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {statsLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin inline" />
                    ) : (
                      stats.pendingInvitations
                    )}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">Awaiting response</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Mail className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-purple-200 shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="elections" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Elections</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Users</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Analytics</TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-purple-600" />
                    Recent Elections
                  </CardTitle>
                  <CardDescription className="text-sm">Latest election activity and status</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {elections.slice(0, 5).map((election) => {
                    const status = getElectionStatus(election);
                    const timeRemaining = formatTimeRemaining(election.start_time, election.end_time);
                    return (
                      <div key={election.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">{election.name}</p>
                            <Badge className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {election.total_votes} votes • {timeRemaining}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/results/${election.id}`)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/elections/${election.id}/candidates`)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Recent Users
                  </CardTitle>
                  <CardDescription className="text-sm">Latest user registrations and activity</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-sm">{user.name}</p>
                          <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {user.email} • Joined {new Date(user.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="elections" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-purple-600" />
                  Create New Election
                </CardTitle>
                <CardDescription className="text-sm">Set up a new election for your organization</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleCreateElection} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="election-name" className="text-sm font-medium">Election Name</Label>
                      <Input
                        id="election-name"
                        value={newElection.name}
                        onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
                        placeholder="Enter election name"
                        className="h-10"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="election-description" className="text-sm font-medium">Description</Label>
                      <Input
                        id="election-description"
                        value={newElection.description}
                        onChange={(e) => setNewElection({ ...newElection, description: e.target.value })}
                        placeholder="Enter description"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="start-date" className="text-sm font-medium">Start Date & Time</Label>
                      <Input
                        id="start-date"
                        type="datetime-local"
                        value={newElection.startDate}
                        onChange={(e) => setNewElection({ ...newElection, startDate: e.target.value })}
                        className="h-10"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-sm font-medium">End Date & Time</Label>
                      <Input
                        id="end-date"
                        type="datetime-local"
                        value={newElection.endDate}
                        onChange={(e) => setNewElection({ ...newElection, endDate: e.target.value })}
                        className="h-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Election
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Manage Elections
                </CardTitle>
                <CardDescription className="text-sm">View and manage existing elections</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {elections.map((election) => {
                    const status = getElectionStatus(election);
                    const timeRemaining = formatTimeRemaining(election.start_time, election.end_time);
                    return (
                      <div key={election.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{election.name}</h3>
                            <Badge className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {formatDateTime(election.start_time)} - {formatDateTime(election.end_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {election.candidates_count} candidates • {election.total_votes} votes • {timeRemaining}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleElectionStatus(election.id, election.is_active)}
                            className={`h-8 text-xs ${
                              election.is_active 
                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                                : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            }`}
                          >
                            {election.is_active ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                            {election.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/elections/${election.id}/candidates`)}
                            className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                          {status.status !== 'upcoming' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/results/${election.id}`)}
                              className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Results
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteElection(election.id)}
                            className="h-8 text-xs bg-red-500 hover:bg-red-600"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Organization Members
                </CardTitle>
                <CardDescription className="text-sm">Manage users in your organization</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          Joined {new Date(user.joined_at).toLocaleDateString()} • Role: {user.role}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Voter Participation
                  </CardTitle>
                  <CardDescription className="text-sm">Election participation trends</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {elections.slice(0, 5).map((election) => {

                      const eligibleVoters = users.filter(user => user.role === 'student').length;
                      const participationRate = eligibleVoters > 0 ? 
                        ((election.total_votes || 0) / eligibleVoters) * 100 : 0;
                      return (
                        <div key={election.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{election.name}</span>
                            <span className="text-gray-600">{Math.round(participationRate)}%</span>
                          </div>
                          <Progress value={participationRate} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Platform Statistics
                  </CardTitle>
                  <CardDescription className="text-sm">Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Elections Created</span>
                      <span className="font-medium">{elections.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Voter Turnout</span>
                      <span className="font-medium">
                        {elections.length > 0 ? Math.round(stats.totalVotes / elections.length) : 0} votes/election
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Students</span>
                      <span className="font-medium">{users.filter(u => u.is_active && u.role === 'student').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Participation</span>
                      <span className="font-medium">
                        {elections.length > 0 ? 
                          Math.round(elections.reduce((sum, e) => {
                            const eligibleVoters = users.filter(user => user.role === 'student').length;
                            const participationRate = eligibleVoters > 0 ? ((e.total_votes || 0) / eligibleVoters) * 100 : 0;
                            return sum + participationRate;
                          }, 0) / elections.length) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

                          
          <TabsContent value="invitations" className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-800 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-orange-600" />
                  Invite Members
                </CardTitle>
                <CardDescription className="text-sm">Send invitations to new members</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Use the invitation system to add new members to your organization. 
                    Track invitation status and manage pending invites.
                  </p>
                  <div className="flex items-center space-x-3">
                    <Button onClick={() => navigate('/admin/invitations')} className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Mail className="h-4 w-4 mr-2" />
                      Manage Invitations
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;