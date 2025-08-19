import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Vote, 
  Shield, 
  Settings, 
  Copy, 
  Plus, 
  Trash2, 
  Eye, 
  Calendar,
  BarChart3,
  UserPlus,
  Key,
  Building,
  Mail,
  Download,
  HelpCircle,
  Info,
  Target,
  RefreshCw
} from 'lucide-react';
import { 
  createInvitationToken,
  getUserOrganizations,
  validateSession
} from '@/lib/api/traditionalAuth';
import { 
  triggerManualCleanup, 
  getCleanupStats, 
  getCleanupLogs,
  cleanupService
} from '@/lib/cleanup';
import { supabase } from '@/lib/supabase';

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  total_votes: number;
  candidates_count: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

interface AccessToken {
  id: string;
  token: string;
  role: string;
  expires_at: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const [elections, setElections] = useState<Election[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accessTokens, setAccessTokens] = useState<AccessToken[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeElections: 0,
    totalVotes: 0,
    pendingInvitations: 0
  });
  const [cleanupStats, setCleanupStats] = useState<any[]>([]);
  const [cleanupLogs, setCleanupLogs] = useState<any[]>([]);
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [newElection, setNewElection] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [invitationForm, setInvitationForm] = useState({
    email: '',
    role: 'voter',
    expiresInDays: 7,
    usageLimit: 1
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Refresh stats when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && organization?.id) {
        loadStats(organization.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [organization?.id]);

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

      // Check if user has admin privileges
      if (session.role !== 'org_owner' && session.role !== 'admin') {
          navigate('/dashboard');
        return;
      }

      setUserRole(session.role);
      await loadOrganizationData(organizationId);
      await loadAllData(organizationId);
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

  const loadAllData = async (organizationId: string) => {
    try {
      await Promise.all([
        loadElections(organizationId),
        loadUsers(organizationId),
        loadAccessTokens(organizationId),
        loadStats(organizationId),
        loadCleanupData()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadElections = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match Election interface
      const transformedData = data?.map(election => ({
        id: election.id,
        name: election.name,
        start_time: election.start_time,
        end_time: election.end_time,
        is_active: election.is_active,
        total_votes: election.total_votes || 0,
        candidates_count: election.candidates?.[0]?.count || 0
      })) || [];
      
      setElections(transformedData);
    } catch (error) {
      console.error('Failed to load elections:', error);
    }
  };

  const loadUsers = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          joined_at,
          is_active,
          auth_users (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      
      const formattedUsers = data?.map(item => ({
        id: item.auth_users?.[0]?.id || '',
        name: item.auth_users?.[0]?.name || '',
        email: item.auth_users?.[0]?.email || '',
        role: item.role,
        joined_at: item.joined_at,
        is_active: item.is_active
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadAccessTokens = async (organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from('access_tokens')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccessTokens(data || []);
    } catch (error) {
      console.error('Failed to load access tokens:', error);
    }
  };

  const loadCleanupData = async () => {
    try {
      const [statsResult, logsResult] = await Promise.all([
        getCleanupStats(),
        getCleanupLogs(20)
      ]);
      
      if (statsResult.success) {
        setCleanupStats(statsResult.stats);
      }
      
      if (logsResult.success) {
        setCleanupLogs(logsResult.logs);
      }
    } catch (error) {
      console.error('Failed to load cleanup data:', error);
    }
  };

  const handleManualCleanup = async () => {
    setIsCleanupRunning(true);
    try {
      const result = await triggerManualCleanup();
      
      if (result.success) {
        toast({
          title: "Cleanup Completed",
          description: `Cleaned ${result.total_cleaned} expired records (Sessions: ${result.sessions_cleaned}, Tokens: ${result.tokens_cleaned}, OTPs: ${result.otps_cleaned}, Password Resets: ${result.password_resets_cleaned})`,
        });
        
        // Refresh cleanup data
        await loadCleanupData();
      } else {
        toast({
          title: "Cleanup Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Cleanup Error",
        description: "Failed to run cleanup operations",
        variant: "destructive",
      });
    } finally {
      setIsCleanupRunning(false);
    }
  };

  const loadStats = async (organizationId: string) => {
    try {
      // Get total users (including organization owner)
      const { count: totalUsers, error: usersError } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (usersError) {
        console.error('Error loading users count:', usersError);
      }

      // Get total elections (not just active ones)
      const { count: totalElections, error: electionsError } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (electionsError) {
        console.error('Error loading elections count:', electionsError);
      }

      // Get active elections
      const { count: activeElections, error: activeElectionsError } = await supabase
        .from('elections')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (activeElectionsError) {
        console.error('Error loading active elections count:', activeElectionsError);
      }

      // Get total votes
      const { count: totalVotes, error: votesError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (votesError) {
        console.error('Error loading votes count:', votesError);
      }

      console.log('Stats loaded:', {
        totalUsers,
        totalElections,
        activeElections,
        totalVotes
      });

      setStats({
        totalUsers: totalUsers || 0,
        activeElections: activeElections || 0,
        totalVotes: totalVotes || 0,
        pendingInvitations: 0 // Simplified for now
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateInvitation = async () => {
    if (!invitationForm.email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const organizationId = localStorage.getItem('organization_id');
      if (!organizationId) throw new Error('No organization found');

      const token = await createInvitationToken({
        organizationId,
        role: invitationForm.role,
        expiresInDays: invitationForm.expiresInDays,
        usageLimit: invitationForm.usageLimit,
        createdBy: localStorage.getItem('user_id') || ''
      });

      // Generate invitation link
      const invitationLink = `${window.location.origin}/auth?token=${token.token}`;

      toast({
        title: "Invitation Created",
        description: "Invitation link has been generated successfully"
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(invitationLink);
      toast({
        title: "Link Copied",
        description: "Invitation link has been copied to clipboard"
      });

      // Reset form and reload data
      setInvitationForm({
        email: '',
        role: 'voter',
        expiresInDays: 7,
        usageLimit: 1
      });
      await loadAccessTokens(organizationId);
      await loadStats(organizationId);
    } catch (error) {
      console.error('Failed to create invitation:', error);
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateElection = async () => {
    if (!newElection.name.trim() || !newElection.startDate || !newElection.endDate) {
        toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
        });
      return;
    }

    setIsLoading(true);
    try {
      const organizationId = localStorage.getItem('organization_id');
      if (!organizationId) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('elections')
        .insert({
          name: newElection.name,
          description: newElection.description,
          start_time: newElection.startDate,
          end_time: newElection.endDate,
          organization_id: organizationId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Election Created",
        description: "New election has been created successfully"
      });

      // Reset form and reload data
      setNewElection({
        name: '',
        startDate: '',
        endDate: '',
        description: ''
      });
      await loadElections(organizationId);
      await loadStats(organizationId);
    } catch (error) {
      console.error('Failed to create election:', error);
      toast({
        title: "Error",
        description: "Failed to create election",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Text copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <Badge variant="secondary">
                {organization?.name}
              </Badge>
              <Badge variant={userRole === 'org_owner' ? 'default' : 'outline'}>
                {userRole === 'org_owner' ? 'Owner' : 'Admin'}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Guidance Section */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
              <Target className="h-6 w-6" />
              Admin Quick Guide
            </CardTitle>
            <CardDescription>
              Manage your organization and elections efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-blue-800">Access Codes</h4>
                  <p className="text-xs text-gray-600">Generate and manage voter/admin codes</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <Vote className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-purple-800">Elections</h4>
                  <p className="text-xs text-gray-600">Create and monitor voting processes</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-green-800">Members</h4>
                  <p className="text-xs text-gray-600">Manage organization users</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Tip:</strong> Create separate access codes for voters and admins, and monitor election progress regularly.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="elections">Elections</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Header with Refresh Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Organization Overview</h2>
              <Button 
                onClick={() => organization?.id && loadStats(organization.id)}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Stats
              </Button>
            </div>
            
        {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                    Active members in your organization
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
                  <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{stats.activeElections}</div>
              <p className="text-xs text-muted-foreground">
                    Currently running elections
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVotes}</div>
              <p className="text-xs text-muted-foreground">
                    Votes cast across all elections
              </p>
          </CardContent>
        </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingInvitations}</div>
              <p className="text-xs text-muted-foreground">
                    Unused invitation links
              </p>
              </CardContent>
            </Card>
          </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                onClick={() => setActiveTab('elections')}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Election</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab('invitations')}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Invite Users</span>
                </Button>
                <Button 
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {elections.slice(0, 3).map((election) => (
                    <div key={election.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{election.name}</h4>
                        <p className="text-sm text-gray-600">
                          {election.total_votes} votes • {election.candidates_count} candidates
                        </p>
                      </div>
                      <Badge variant={election.is_active ? "default" : "secondary"}>
                        {election.is_active ? "Active" : "Ended"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Elections Tab */}
          <TabsContent value="elections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Election</CardTitle>
                <CardDescription>
                  Set up a new voting event for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="election-name">Election Name</Label>
                    <Input
                      id="election-name"
                      value={newElection.name}
                      onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
                      placeholder="Enter election name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="election-description">Description</Label>
                    <Input
                      id="election-description"
                      value={newElection.description}
                      onChange={(e) => setNewElection({ ...newElection, description: e.target.value })}
                      placeholder="Enter description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={newElection.startDate}
                      onChange={(e) => setNewElection({ ...newElection, startDate: e.target.value })}
                    />
                  </div>
                            <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="datetime-local"
                      value={newElection.endDate}
                      onChange={(e) => setNewElection({ ...newElection, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateElection} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Election'}
                      </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Elections</CardTitle>
              </CardHeader>
              <CardContent>
                    <div className="space-y-4">
                  {elections.map((election) => (
                    <div key={election.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                <h4 className="font-medium">{election.name}</h4>
                                <p className="text-sm text-gray-600">
                          {new Date(election.start_time).toLocaleDateString()} - {new Date(election.end_time).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {election.total_votes} votes • {election.candidates_count} candidates
                                </p>
                                </div>
                              <div className="flex items-center space-x-2">
                        <Badge variant={election.is_active ? "default" : "secondary"}>
                          {election.is_active ? "Active" : "Ended"}
                        </Badge>
                                <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>
                  Manage users in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          Joined {new Date(user.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.role === 'org_owner' ? 'default' : 'outline'}>
                          {user.role === 'org_owner' ? 'Owner' : user.role}
                        </Badge>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                            </div>
                          </CardContent>
                        </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Invitation</CardTitle>
                <CardDescription>
                  Generate secure invitation links for new users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invite-email">Email (Optional)</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={invitationForm.email}
                      onChange={(e) => setInvitationForm({ ...invitationForm, email: e.target.value })}
                      placeholder="Enter email for tracking"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <select
                      id="invite-role"
                      value={invitationForm.role}
                      onChange={(e) => setInvitationForm({ ...invitationForm, role: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="voter">Voter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="expires-in">Expires In (Days)</Label>
                    <Input
                      id="expires-in"
                      type="number"
                      value={invitationForm.expiresInDays}
                      onChange={(e) => setInvitationForm({ ...invitationForm, expiresInDays: parseInt(e.target.value) })}
                      min="1"
                      max="30"
                    />
              </div>
              <div>
                    <Label htmlFor="usage-limit">Usage Limit</Label>
                    <Input
                      id="usage-limit"
                      type="number"
                      value={invitationForm.usageLimit}
                      onChange={(e) => setInvitationForm({ ...invitationForm, usageLimit: parseInt(e.target.value) })}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateInvitation} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Invitation'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Codes</CardTitle>
                <CardDescription>
                  Your organization's access codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Voter Access Code</Label>
                      <Badge variant="outline">Voter</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={organization?.voter_access_code || 'Not set'}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(organization?.voter_access_code || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Admin Access Code</Label>
                      <Badge variant="outline">Admin</Badge>
              </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={organization?.admin_access_code || 'Not set'}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(organization?.admin_access_code || '')}
                      >
                        <Copy className="h-4 w-4" />
                  </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accessTokens.map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={token.role === 'admin' ? 'default' : 'outline'}>
                            {token.role}
                          </Badge>
                          <Badge variant={token.is_active ? 'default' : 'secondary'}>
                            {token.is_active ? 'Active' : 'Expired'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Used {token.used_count}/{token.usage_limit} times
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires {new Date(token.expires_at).toLocaleDateString()}
                        </p>
              </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/auth?token=${token.token}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
              </div>
            </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Cleanup</CardTitle>
                <CardDescription>
                  Manage expired sessions, tokens, and other system data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Automatic Cleanup</h4>
                    <p className="text-sm text-gray-600">
                      System automatically cleans expired data periodically
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {cleanupService.getStatus().autoCleanupEnabled ? 'Enabled' : 'Disabled'} 
                      {cleanupService.getStatus().isRunning && ' (Running...)'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleManualCleanup}
                    disabled={isCleanupRunning}
                    variant="outline"
                  >
                    {isCleanupRunning ? 'Running...' : 'Run Manual Cleanup'}
                  </Button>
                </div>

                {/* Cleanup Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cleanupStats.map((stat) => (
                    <Card key={stat.operation_type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium capitalize">
                          {stat.operation_type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{stat.total_records_cleaned}</div>
                        <p className="text-xs text-muted-foreground">
                          Records cleaned ({stat.total_runs} runs)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last: {stat.last_run ? new Date(stat.last_run).toLocaleDateString() : 'Never'}
                        </p>
                        {stat.failed_runs > 0 && (
                          <p className="text-xs text-red-600">
                            {stat.failed_runs} failed runs
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Cleanup Logs</CardTitle>
                <CardDescription>
                  View recent cleanup operations and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cleanupLogs.length > 0 ? (
                    cleanupLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                              {log.operation_type}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {log.records_affected} records affected
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(log.created_at).toLocaleString()}
                            {log.execution_time && ` • ${log.execution_time}`}
                          </p>
                          {log.error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {log.error_message}
                            </p>
                          )}
                        </div>
                        <Badge variant={log.status === 'success' ? 'outline' : 'destructive'}>
                          {log.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No cleanup logs available</p>
                      <p className="text-sm">Run a manual cleanup to see logs</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Current system status and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm">Cleanup Settings</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>• Sessions expire after: 24 hours</p>
                      <p>• Tokens cleaned after: 7 days post-expiry</p>
                      <p>• OTPs expire immediately after use</p>
                      <p>• Password resets expire after: 1 hour</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm">Auto-Cleanup Status</h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>• Trigger-based cleanup: Enabled</p>
                      <p>• Manual cleanup: Available</p>
                      <p>• Background service: {cleanupService.getStatus().autoCleanupEnabled ? 'Running' : 'Stopped'}</p>
                      <p>• Last cleanup: Check logs above</p>
                    </div>
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
