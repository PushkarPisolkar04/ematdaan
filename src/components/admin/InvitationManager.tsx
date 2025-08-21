import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Users, Mail, CheckCircle, Clock, XCircle, Download, Plus, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { invitationApi } from '@/lib/invitationApi';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const InvitationManager: React.FC = () => {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [manualInvitations, setManualInvitations] = useState<Array<{ email: string }>>([{ email: '' }]);
  const [sendingManual, setSendingManual] = useState(false);
  const [stats, setStats] = useState<InvitationStats>({
    total_invitations: 0,
    used_invitations: 0,
    pending_invitations: 0,
    expired_invitations: 0
  });
  const [invitations, setInvitations] = useState<StudentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingInvitation, setDeletingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      loadInvitationData();
    }
  }, [organization]);

  const loadInvitationData = async () => {
    try {
      setLoading(true);
      
      if (!organization?.id) {
        throw new Error('No organization ID found');
      }
      
      const invitationStats = await invitationApi.getInvitationStats(organization.id);
      setStats(invitationStats);
      
      const orgInvitations = await invitationApi.getInvitations(organization.id);
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
      
      if (!organization?.id) {
        throw new Error('No organization ID found');
      }
      
      const csvText = await selectedFile.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      const emails = [];
      for (const line of lines) {
        const email = line.trim();
        if (email && isValidEmail(email)) {
          emails.push(email.toLowerCase());
        }
      }
      
      if (emails.length === 0) {
        throw new Error('No valid emails found in CSV');
      }
      
      const result = await invitationApi.createInvitations({
        emails,
        organizationId: organization.id
      });
      
      if (result.success) {
        toast({
          title: "Upload Successful",
          description: `${result.count} invitations sent successfully`,
        });
        
        await loadInvitationData();
        
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

  const addManualInvitationRow = () => {
    setManualInvitations([...manualInvitations, { email: '' }]);
  };

  const removeManualInvitationRow = (index: number) => {
    if (manualInvitations.length > 1) {
      setManualInvitations(manualInvitations.filter((_, i) => i !== index));
    }
  };

  const updateManualInvitation = (index: number, value: string) => {
    const updated = [...manualInvitations];
    updated[index].email = value;
    setManualInvitations(updated);
  };

  const handleManualInvitations = async () => {
    // Filter out empty rows
    const validInvitations = manualInvitations.filter(inv => inv.email.trim());
    
    if (validInvitations.length === 0) {
      toast({
        title: "No Valid Invitations",
        description: "Please add at least one valid email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingManual(true);
      
      if (!organization?.id) {
        throw new Error('No organization ID found');
      }

      const emails = validInvitations.map(inv => inv.email.trim());
      
      const result = await invitationApi.createInvitations({
        emails,
        organizationId: organization.id
      });
      
      if (result.success) {
        toast({
          title: "Invitations Sent",
          description: `${result.count} invitations sent successfully`,
        });
        
        await loadInvitationData();
        
        setManualInvitations([{ email: '' }]);
      }
    } catch (error) {
      console.error('Error sending manual invitations:', error);
      toast({
        title: "Failed to Send Invitations",
        description: error instanceof Error ? error.message : "Failed to send invitations",
        variant: "destructive"
      });
    } finally {
      setSendingManual(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      setDeletingInvitation(invitationId);
      
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/invitations/delete/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete invitation');
      }
      
      toast({
        title: "Invitation Deleted",
        description: "Invitation has been successfully deleted",
      });
      
      await loadInvitationData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete invitation",
        variant: "destructive"
      });
    } finally {
      setDeletingInvitation(null);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `student1@college.edu
student2@college.edu
student3@college.edu`;
    
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  
        <div className="mb-8">
          <Button
            onClick={() => navigate('/admin')}
            variant="ghost"
            className="mb-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Invitation Manager
              </h1>
              <p className="text-lg text-gray-600">
                Upload student list and send voting invitations
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="text-base font-semibold text-blue-800">Total Invitations</CardTitle>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total_invitations}</div>
                <p className="text-sm text-blue-600">
                  Invitations sent
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                <CardTitle className="text-base font-semibold text-green-800">Used Invitations</CardTitle>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-green-600 mb-1">{stats.used_invitations}</div>
                <p className="text-sm text-green-600">
                  Students registered
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100">
                <CardTitle className="text-base font-semibold text-yellow-800">Pending Invitations</CardTitle>
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.pending_invitations}</div>
                <p className="text-sm text-yellow-600">
                  Awaiting registration
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
                <CardTitle className="text-base font-semibold text-red-800">Expired Invitations</CardTitle>
                <div className="p-3 bg-red-100 rounded-xl">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-3xl font-bold text-red-600 mb-1">{stats.expired_invitations}</div>
                <p className="text-sm text-red-600">
                  Expired links
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="bg-white border border-blue-200 shadow-sm">
              <TabsTrigger value="upload" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-base">Upload Students</TabsTrigger>
              <TabsTrigger value="manual" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-base">Manual Add</TabsTrigger>
              <TabsTrigger value="invitations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-base">Manage Invitations</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-xl text-blue-800 font-semibold">Upload Student List</CardTitle>
                  <CardDescription className="text-base text-blue-700">
                    Upload a CSV file with student emails to send voting invitations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-3">
                    <Label htmlFor="csv-upload" className="text-base font-semibold">Select CSV File</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12"
                    />
                    <p className="text-sm text-muted-foreground">
                      CSV should contain one email address per line. No headers required.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Button onClick={downloadSampleCSV} variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50 h-10">
                      <Download className="h-4 w-4 mr-2" />
                      Download Sample CSV
                    </Button>
                  </div>

                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="text-base">
                      Invitation emails will be sent automatically to all students in the CSV file. 
                      Each student will receive a unique invitation link that can only be used once.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={handleUpload} 
                    disabled={!selectedFile || uploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg h-12 text-base"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload and Send Invitations'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-xl text-blue-800 font-semibold">Add Students Manually</CardTitle>
                  <CardDescription className="text-base text-blue-700">
                    Add individual students by entering their email addresses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {manualInvitations.map((invitation, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex-1">
                        <Label htmlFor={`email-${index}`} className="text-base text-blue-700 font-semibold">Email</Label>
                        <Input
                          id={`email-${index}`}
                          type="email"
                          placeholder="student@example.com"
                          value={invitation.email}
                          onChange={(e) => updateManualInvitation(index, e.target.value)}
                          className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12"
                        />
                      </div>
                      {manualInvitations.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeManualInvitationRow(index)}
                          className="mt-8 h-10"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={addManualInvitationRow}
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 h-12 text-base"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Another Student
                  </Button>

                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="text-base">
                      Invitation emails will be sent automatically to all students you add. 
                      Each student will receive a unique invitation link that can only be used once.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleManualInvitations}
                    disabled={sendingManual || manualInvitations.every(inv => !inv.email.trim())}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg h-12 text-base"
                  >
                    <Mail className="h-5 w-5 mr-2" />
                    {sendingManual ? 'Sending Invitations...' : 'Send Invitations'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invitations" className="space-y-6">
              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-xl text-blue-800 font-semibold">Invitation List</CardTitle>
                  <CardDescription className="text-base text-blue-700">
                    View and manage all sent invitations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base font-semibold">Email</TableHead>
                        <TableHead className="text-base font-semibold">Status</TableHead>
                        <TableHead className="text-base font-semibold">Sent Date</TableHead>
                        <TableHead className="text-base font-semibold">Expires</TableHead>
                        <TableHead className="text-base font-semibold">Used Date</TableHead>
                        <TableHead className="text-base font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-semibold text-base">
                            {invitation.email}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invitation)}
                          </TableCell>
                          <TableCell className="text-base">
                            {new Date(invitation.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-base">
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-base">
                            {invitation.used_at 
                              ? new Date(invitation.used_at).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              disabled={deletingInvitation === invitation.id}
                              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 h-10"
                            >
                              {deletingInvitation === invitation.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {invitations.length === 0 && (
                    <div className="text-center py-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <Mail className="h-10 w-10 text-blue-600" />
                      </div>
                      <p className="text-blue-600 font-semibold text-lg">No invitations sent yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InvitationManager; 