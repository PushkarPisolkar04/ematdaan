import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  History, 
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
  const { user, organization, userRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (user) {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
                <p className="text-lg text-gray-600 mb-3">{user.email}</p>
                <div className="flex items-center space-x-3">
                  <Badge variant={userRole === 'admin' ? 'default' : 'secondary'} className={`text-sm ${userRole === 'admin' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                    {userRole === 'admin' ? 'Administrator' : 'Student'}
                  </Badge>
                  <Badge variant="outline" className="text-sm border-purple-300 text-purple-700 bg-purple-50">{organization.name}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {userRole === 'admin' ? (
          // Admin view - no tabs, just show personal info
          <div className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-800 flex items-center space-x-3">
                  <User className="h-6 w-6 text-purple-600" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Your account details and information
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-gray-700">Full Name</h3>
                    <p className="text-lg text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">{user.name}</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-gray-700">Email Address</h3>
                    <p className="text-lg text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">{user.email}</p>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-base text-gray-700 mb-2">Organization</h3>
                    <p className="text-lg text-gray-900">{organization.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-gray-700 mb-2">Role</h3>
                    <p className="text-lg text-gray-900">Administrator</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Student view - with tabs
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 shadow-sm">
              <TabsTrigger value="personal" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-base">Personal Info</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-base">Vote History</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-gray-800 flex items-center space-x-3">
                    <User className="h-6 w-6 text-purple-600" />
                    <span>Personal Information</span>
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    Your account details and information
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-base text-gray-700">Full Name</h3>
                      <p className="text-lg text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">{user.name}</p>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-base text-gray-700">Email Address</h3>
                      <p className="text-lg text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">{user.email}</p>
                    </div>
                  </div>

                  <Separator className="bg-gray-200" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-base text-gray-700 mb-2">Organization</h3>
                      <p className="text-lg text-gray-900">{organization.name}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-gray-700 mb-2">Role</h3>
                      <p className="text-lg text-gray-900">Student</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vote History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-gray-800 flex items-center space-x-3">
                    <History className="h-6 w-6 text-purple-600" />
                    <span>Voting History</span>
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600">
                    View all your past votes and download receipts
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {voteHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No votes yet</h3>
                      <p className="text-gray-600 text-base">You haven't participated in any elections yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {voteHistory.map((vote) => (
                        <div key={vote.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{vote.election.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{vote.election.description}</p>
                            </div>
                            <Badge variant="outline" className="text-sm border-purple-300 text-purple-700 bg-purple-50">
                              {new Date(vote.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <p className="text-sm"><strong>Voted for:</strong> <span className="text-gray-900">{vote.candidate.name}</span></p>
                              {vote.candidate.party && (
                                <p className="text-sm"><strong>Party:</strong> <span className="text-gray-900">{vote.candidate.party}</span></p>
                              )}
                              <p className="text-xs text-gray-500">
                                <strong>Receipt ID:</strong> {vote.vote_hash.slice(-16)}...
                              </p>
                            </div>
                            
                            <div className="flex space-x-3">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/verify-vote/${vote.vote_hash}`)}
                                className="h-9 text-sm border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
                                Verify Vote
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadReceipt(vote)}
                                className="h-9 text-sm border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
                                <Download className="h-4 w-4 mr-2" />
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
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Profile; 