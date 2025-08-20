import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Vote, 
  Plus, 
  Calendar,
  BarChart3,
  Mail,
  RefreshCw,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { supabase, electionApi, candidateApi } from '@/lib/supabase';
import { generateAuditReport } from '@/lib/receipt';

interface Election {
  id: string;
  name: string;
  description?: string;
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, organization, userRole, isAuthenticated } = useAuth();

  // Form states
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
      navigate('/dashboard');
      return;
    }

    loadAdminData();
  }, [isAuthenticated, userRole, organization]);

  const loadAdminData = async () => {
    if (!organization) return;
    
    try {
      setIsLoading(true);
      await Promise.all([
        loadElections(),
        loadUsers(),
        loadStats()
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
      const electionsData = await electionApi.getSchedule(organization?.id);
      
      const processedElections = await Promise.all((electionsData || []).map(async (election) => {
        // Get vote count for this election
        const { count: totalVotes } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('election_id', election.id);

        return {
          id: election.id,
          name: election.name,
          description: election.description,
          start_time: election.start_time,
          end_time: election.end_time,
          is_active: election.is_active,
          total_votes: totalVotes || 0,
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

  const loadStats = async () => {
    try {
      const totalUsers = users.length;
      const activeElections = elections.filter(e => e.is_active).length;
      const totalVotes = elections.reduce((sum, e) => sum + e.total_votes, 0);

      // Get pending invitations count
      const { count: pendingInvitations } = await supabase
        .from('access_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization?.id)
        .eq('is_active', true)
        .lt('used_count', 'usage_limit');

      setStats({
        totalUsers,
        activeElections,
        totalVotes,
        pendingInvitations: pendingInvitations || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      throw error;
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
      
      await electionApi.setSchedule({
        name: newElection.name,
        startTime: newElection.startDate,
        endTime: newElection.endDate,
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
      const { error } = await supabase
        .from('elections')
        .update({ is_active: !currentStatus })
        .eq('id', electionId);

      if (error) throw error;

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
      const { error } = await supabase
        .from('elections')
        .delete()
        .eq('id', electionId);

      if (error) throw error;

      toast({
        title: "Election Deleted",
        description: "Election has been deleted successfully"
      });

      await loadElections();
    } catch (error) {
      console.error('Failed to delete election:', error);
      toast({
        title: "Error",
        description: "Failed to delete election",
        variant: "destructive"
      });
    }
  };

  const handleGenerateAuditReport = async (electionId: string) => {
    try {
      // Get election details
      const { data: election, error: electionError } = await supabase
        .from('elections')
        .select('*')
        .eq('id', electionId)
        .single();

      if (electionError || !election) {
        throw new Error('Election not found');
      }

      // Get audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organization?.id)
        .gte('created_at', election.start_time)
        .lte('created_at', election.end_time)
        .order('created_at', { ascending: true });

      if (auditError) {
        console.warn('Failed to fetch audit logs:', auditError);
      }

      // Get vote logs
      const { data: voteLogs, error: voteError } = await supabase
        .from('votes')
        .select('*')
        .eq('election_id', electionId)
        .order('created_at', { ascending: true });

      if (voteError) {
        console.warn('Failed to fetch vote logs:', voteError);
      }

      // Get user statistics
      const { count: totalRegistered } = await supabase
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization?.id)
        .eq('is_active', true);

      const totalVoted = voteLogs?.length || 0;
      const totalAbstained = (totalRegistered || 0) - totalVoted;

      // Get security metrics
      const { count: totalSessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization?.id)
        .gte('created_at', election.start_time)
        .lte('created_at', election.end_time);

      const { count: totalOTPs } = await supabase
        .from('otps')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', election.start_time)
        .lte('created_at', election.end_time);

      const { count: totalMFA } = await supabase
        .from('mfa_tokens')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', election.start_time)
        .lte('created_at', election.end_time);

      // Generate audit report
      await generateAuditReport({
        election: {
          id: election.id,
          name: election.name,
          start_time: election.start_time,
          end_time: election.end_time
        },
        organization: {
          id: organization?.id || '',
          name: organization?.name || ''
        },
        auditLogs: auditLogs || [],
        voteLogs: voteLogs || [],
        userStats: {
          totalRegistered: totalRegistered || 0,
          totalVoted,
          totalAbstained
        },
        securityMetrics: {
          totalSessions: totalSessions || 0,
          totalOTPs: totalOTPs || 0,
          totalMFA: totalMFA || 0,
          suspiciousActivities: 0 // This would be calculated based on your security rules
        }
      });

      toast({
        title: "Audit Report Generated",
        description: "Election audit report has been downloaded"
      });

    } catch (error) {
      console.error('Failed to generate audit report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate audit report. Please try again.",
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">
                {organization?.name} • Manage elections, users, and settings
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Elections</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeElections}</p>
                </div>
                <Vote className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Votes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalVotes}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Invitations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingInvitations}</p>
                </div>
                <Mail className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="elections">Elections</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Elections</CardTitle>
                  <CardDescription>Latest election activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {elections.slice(0, 5).map((election) => (
                    <div key={election.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{election.name}</p>
                        <p className="text-sm text-gray-600">{election.total_votes} votes</p>
                      </div>
                      <Badge variant={election.is_active ? "default" : "secondary"}>
                        {election.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Elections Tab */}
          <TabsContent value="elections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Election</CardTitle>
                <CardDescription>Set up a new election for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateElection} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="election-name">Election Name</Label>
                      <Input
                        id="election-name"
                        value={newElection.name}
                        onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
                        placeholder="Enter election name"
                        required
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
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">End Date</Label>
                      <Input
                        id="end-date"
                        type="datetime-local"
                        value={newElection.endDate}
                        onChange={(e) => setNewElection({ ...newElection, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Election
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manage Elections</CardTitle>
                <CardDescription>View and manage existing elections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {elections.map((election) => (
                    <div key={election.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{election.name}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(election.start_time).toLocaleDateString()} - {new Date(election.end_time).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {election.candidates_count} candidates • {election.total_votes} votes
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={election.is_active ? "default" : "secondary"}>
                          {election.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleElectionStatus(election.id, election.is_active)}
                        >
                          {election.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/elections/${election.id}/candidates`)}
                        >
                          Manage Candidates
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateAuditReport(election.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Audit Report
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteElection(election.id)}
                        >
                          Delete
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
                <CardDescription>Manage users in your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          Joined {new Date(user.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{user.role}</Badge>
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
                <CardTitle>Invite Members</CardTitle>
                <CardDescription>Send invitations to new members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Use the invitation system to add new members to your organization.
                </p>
                <Button onClick={() => navigate('/admin/invitations')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Manage Invitations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
