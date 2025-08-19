import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Shield, 
  Building, 
  Calendar,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import { validateSession } from '@/lib/api/traditionalAuth';
import { supabase } from '@/lib/supabase';

const Profile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [userOrganization, setUserOrganization] = useState<any>(null);
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
      await loadUserOrganizationData(organizationId, session.user_id);
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

  const loadUserOrganizationData = async (organizationId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserOrganization(data);
    } catch (error) {
      console.error('Failed to load user organization data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
    localStorage.removeItem('isAuthenticated');
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
    
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>
                  Your account details and personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={user.name || 'Not provided'}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={user.role === 'org_owner' ? 'default' : 'outline'}>
                      {user.role === 'org_owner' ? 'Organization Owner' : user.role}
                    </Badge>
                    <Shield className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Organization Information</span>
                </CardTitle>
                <CardDescription>
                  Details about your organization membership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={organization?.name || 'Unknown'}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-domain">Organization Domain</Label>
                    <Input
                      id="org-domain"
                      value={organization?.domain || 'Not set'}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="joined-date">Joined Date</Label>
                    <Input
                      id="joined-date"
                      value={userOrganization ? new Date(userOrganization.joined_at).toLocaleDateString() : 'Unknown'}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="joined-via">Joined Via</Label>
                    <Input
                      id="joined-via"
                      value={userOrganization?.joined_via || 'Unknown'}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="org-role">Organization Role</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={userOrganization?.role === 'org_owner' ? 'default' : 'outline'}>
                      {userOrganization?.role === 'org_owner' ? 'Owner' : userOrganization?.role}
                    </Badge>
                    <Badge variant={userOrganization?.is_active ? 'default' : 'secondary'}>
                      {userOrganization?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Account Activity</span>
                </CardTitle>
                <CardDescription>
                  Recent activity and account statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </div>
                    <div className="text-sm text-gray-600">Last Login</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {user.is_verified ? 'Yes' : 'No'}
                    </div>
                    <div className="text-sm text-gray-600">Email Verified</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {user.login_attempts || 0}
                    </div>
                    <div className="text-sm text-gray-600">Login Attempts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/dashboard')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                {(user.role === 'org_owner' || user.role === 'admin') && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/admin')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verification</span>
                  <Badge variant={user.is_verified ? 'default' : 'secondary'}>
                    {user.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Status</span>
                  <Badge variant={user.is_locked ? 'destructive' : 'default'}>
                    {user.is_locked ? 'Locked' : 'Active'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Organization Status</span>
                  <Badge variant={userOrganization?.is_active ? 'default' : 'secondary'}>
                    {userOrganization?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Need help? Contact your organization administrator or reach out to our support team.
                </p>
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 