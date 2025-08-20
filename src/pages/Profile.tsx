import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Shield, 
  Key, 
  History, 
  Save, 
  X,
  Trash2,
  Download
} from 'lucide-react';

interface VoteHistory {
  id: string;
  vote_hash: string;
  created_at: string;
  election: {
    id: string;
    name: string;
    description: string;
  };
  candidate: {
    id: string;
    name: string;
    party?: string;
  };
}

const Profile: React.FC = () => {
  const { user, organization, userRole, isAuthenticated, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);

  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: '' // We don't have phone in our schema yet
      });
      loadVoteHistory();
    }
  }, [isAuthenticated, user]);



  const loadVoteHistory = async () => {
    if (!user) return;

    try {
      const { data: votes, error } = await supabase
        .from('votes')
        .select(`
          id,
          vote_hash,
          created_at,
          elections!inner(
            id,
            name,
            description
          ),
          candidates!inner(
            id,
            name,
            party
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const transformedVotes: VoteHistory[] = votes?.map(vote => ({
        id: vote.id,
        vote_hash: vote.vote_hash,
        created_at: vote.created_at,
        election: Array.isArray(vote.elections) ? vote.elections[0] : vote.elections,
        candidate: Array.isArray(vote.candidates) ? vote.candidates[0] : vote.candidates
      })) || [];

      setVoteHistory(transformedVotes);
    } catch (error) {
      console.error('Failed to load vote history:', error);
      toast({
        title: "Error",
        description: "Failed to load voting history",
        variant: "destructive"
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Use the updateUser function from AuthContext
      await updateUser({
        name: profileData.name
      });

    } catch (error) {
      console.error('Failed to update profile:', error);
      // Error handling is already done in the updateUser function
    } finally {
      setLoading(false);
    }
  };



  const handleDownloadReceipt = (vote: VoteHistory) => {
    const receiptData = `
VOTE RECEIPT
============

Receipt ID: ${vote.vote_hash}
Election: ${vote.election.name}
Candidate: ${vote.candidate.name}
${vote.candidate.party ? `Party: ${vote.candidate.party}` : ''}
Vote Time: ${new Date(vote.created_at).toLocaleString()}

This receipt serves as proof of your vote submission.
Keep this receipt for your records.

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vote-receipt-${vote.vote_hash.slice(-8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Receipt Downloaded",
      description: "Vote receipt has been downloaded successfully"
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);

      // In a real app, you'd have a proper account deletion flow
      // For now, we'll just show a message
      toast({
        title: "Account Deletion",
        description: "Account deletion feature will be available soon. Please contact support.",
        variant: "destructive"
      });

    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !organization) {
      return (
    <div className="min-h-screen bg-gray-50 pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Available</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                {userRole === 'admin' ? 'Administrator' : 'Student'}
              </Badge>
              <Badge variant="outline">{organization.name}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className={`grid w-full ${userRole === 'admin' ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {userRole !== 'admin' && <TabsTrigger value="history">Vote History</TabsTrigger>}
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Personal Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Organization</h3>
                  <p className="text-sm text-gray-500">{organization.name}</p>
                </div>
                <div>
                  <h3 className="font-medium">Role</h3>
                  <p className="text-sm text-gray-500">{userRole === 'admin' ? 'Administrator' : 'Student'}</p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setProfileData({
                    name: user.name || '',
                    email: user.email || '',
                    phone: ''
                  })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Password Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Password</h3>
                    <p className="text-sm text-gray-500">Last changed: Not available</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/reset-password')}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                </div>


              </div>

              <Separator />

              {/* Session Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Session Management</h3>
                    <p className="text-sm text-gray-500">Manage your active sessions</p>
                  </div>
                  <Button variant="outline" onClick={logout}>
                    Sign Out All Sessions
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-red-600">Danger Zone</h3>
                  <p className="text-sm text-gray-500">Irreversible and destructive actions</p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vote History Tab - Only for non-admin users */}
        {userRole !== 'admin' && (
          <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Voting History</span>
              </CardTitle>
              <CardDescription>
                View all your past votes and download receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {voteHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No votes yet</h3>
                  <p className="text-gray-500">You haven't participated in any elections yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {voteHistory.map((vote) => (
                    <div key={vote.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{vote.election.name}</h3>
                          <p className="text-sm text-gray-500">{vote.election.description}</p>
                        </div>
                        <Badge variant="outline">
                          {new Date(vote.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <p><strong>Voted for:</strong> {vote.candidate.name}</p>
                          {vote.candidate.party && (
                            <p><strong>Party:</strong> {vote.candidate.party}</p>
                          )}
                          <p className="text-gray-500">
                            <strong>Receipt ID:</strong> {vote.vote_hash.slice(-16)}...
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/verify-vote/${vote.vote_hash}`)}
                          >
                            Verify Vote
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReceipt(vote)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
      </div>
    </div>
  );
};

export default Profile; 