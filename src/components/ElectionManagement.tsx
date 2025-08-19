import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Users,
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { generateElectionReport } from '@/lib/pdfReports';

interface Election {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  total_votes: number;
  total_registered: number;
  created_at: string;
  candidates: Array<{
    id: string;
    name: string;
    description: string;
    votes: number;
  }>;
}

const ElectionManagement = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const fetchElections = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('elections')
        .select(`
          *,
          candidates(*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setElections(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch elections",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, [organization]);

  const toggleElectionStatus = async (electionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('elections')
        .update({ is_active: !currentStatus })
        .eq('id', electionId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Election ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchElections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update election status",
        variant: "destructive"
      });
    }
  };

  const deleteElection = async (electionId: string) => {
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
        description: "Election has been permanently deleted",
      });

      fetchElections();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete election",
        variant: "destructive"
      });
    }
  };

  const generateReport = async (electionId: string) => {
    try {
      toast({
        title: "Generating Report",
        description: "Election report is being generated...",
      });

      await generateElectionReport(electionId);
      
      toast({
        title: "Report Generated",
        description: "Election report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate election report",
        variant: "destructive"
      });
    }
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const startTime = new Date(election.start_time);
    const endTime = new Date(election.end_time);

    if (!election.is_active) {
      return { status: 'inactive', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-4 w-4" /> };
    }

    if (now < startTime) {
      return { status: 'upcoming', color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-4 w-4" /> };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'active', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" /> };
    } else {
      return { status: 'ended', color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-4 w-4" /> };
    }
  };

  const calculateTurnout = (election: Election) => {
    if (election.total_registered === 0) return 0;
    return (election.total_votes / election.total_registered) * 100;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B21E8] mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading elections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Election Management</h2>
          <p className="text-gray-600">Create, edit, and manage elections</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Election
        </Button>
      </div>

      {/* Elections List */}
      {elections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections</h3>
            <p className="text-gray-600 mb-4">Create your first election to get started</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Election
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {elections.map((election) => {
            const status = getElectionStatus(election);
            const turnout = calculateTurnout(election);
            
            return (
              <Card key={election.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{election.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {election.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <Badge className={status.color}>
                      {status.icon}
                      <span className="ml-1 capitalize">{status.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Election Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">Start</div>
                        <div className="text-gray-600">
                          {new Date(election.start_time).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">End</div>
                        <div className="text-gray-600">
                          {new Date(election.end_time).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {election.candidates?.length || 0}
                      </div>
                      <div className="text-xs text-gray-600">Candidates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {election.total_votes.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Votes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {turnout.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Turnout</div>
                    </div>
                  </div>

                  {/* Turnout Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Voter Turnout</span>
                      <span>{turnout.toFixed(1)}%</span>
                    </div>
                    <Progress value={turnout} className="h-2" />
                    <div className="text-xs text-gray-500 mt-1">
                      {election.total_votes} of {election.total_registered} registered voters
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => generateReport(election.id)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Report
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleElectionStatus(election.id, election.is_active)}
                    >
                      {election.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteElection(election.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ElectionManagement; 