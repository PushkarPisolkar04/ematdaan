import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Users, Mail, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadStudentCSV, getInvitationStats, getOrganizationInvitations } from '@/lib/invitationSystem';
import { toast } from '@/hooks/use-toast';

interface InvitationStats {
  total_invitations: number;
  used_invitations: number;
  pending_invitations: number;
  expired_invitations: number;
}

interface StudentInvitation {
  id: string;
  email: string;
  invitation_token: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

const InvitationManager: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<InvitationStats>({
    total_invitations: 0,
    used_invitations: 0,
    pending_invitations: 0,
    expired_invitations: 0
  });
  const [invitations, setInvitations] = useState<StudentInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitationData();
  }, []);

  const loadInvitationData = async () => {
    try {
      setLoading(true);
      
      // Get current organization ID from localStorage
      const organizationId = localStorage.getItem('organization_id');
      
      if (!organizationId) {
        throw new Error('No organization ID found');
      }
      
      // Load stats
      const invitationStats = await getInvitationStats(organizationId);
      setStats(invitationStats);
      
      // Load invitations
      const orgInvitations = await getOrganizationInvitations(organizationId);
      setInvitations(orgInvitations);
      
    } catch (error) {
      console.error('Error loading invitation data:', error);
      toast({
        title: "Error",
        description: "Failed to load invitation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      // Get current organization ID from localStorage
      const organizationId = localStorage.getItem('organization_id');
      
      if (!organizationId) {
        throw new Error('No organization ID found');
      }
      
      const result = await uploadStudentCSV(selectedFile, organizationId);
      
      if (result.success) {
        toast({
          title: "Upload Successful",
          description: `${result.count} invitations sent successfully`,
        });
        
        // Reload data
        await loadInvitationData();
        
        // Clear file selection
        setSelectedFile(null);
        const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `email,name,department
student1@college.edu,John Doe,Computer Science
student2@college.edu,Jane Smith,Mathematics
student3@college.edu,Bob Johnson,Physics`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (invitation: StudentInvitation) => {
    if (invitation.is_used) {
      return <Badge variant="default" className="bg-green-500">Used</Badge>;
    } else if (new Date(invitation.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Invitation Manager</h2>
        <p className="text-muted-foreground">
          Upload student list and send voting invitations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_invitations}</div>
            <p className="text-xs text-muted-foreground">
              Invitations sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Invitations</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.used_invitations}</div>
            <p className="text-xs text-muted-foreground">
              Students registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending_invitations}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting registration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Invitations</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.expired_invitations}</div>
            <p className="text-xs text-muted-foreground">
              Expired links
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Students</TabsTrigger>
          <TabsTrigger value="invitations">Manage Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Student List</CardTitle>
              <CardDescription>
                Upload a CSV file with student emails to send voting invitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-upload">Select CSV File</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <p className="text-sm text-muted-foreground">
                  CSV should contain an "email" column with student email addresses
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button onClick={downloadSampleCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Invitation emails will be sent automatically to all students in the CSV file. 
                  Each student will receive a unique invitation link that can only be used once.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload and Send Invitations'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invitation List</CardTitle>
              <CardDescription>
                View and manage all sent invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Used Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invitation)}
                      </TableCell>
                      <TableCell>
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invitation.used_at 
                          ? new Date(invitation.used_at).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {invitations.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No invitations sent yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvitationManager; 