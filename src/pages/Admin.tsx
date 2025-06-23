import { useState, useEffect } from "react";
import { Shield, Clock, Users, Plus, Edit, Save, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { electionApi, candidateApi, authApi, isUserAdmin } from "@/lib/supabase";
import { createElection } from '@/lib/api/election';

interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  election_id: string;
}

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  candidates?: Candidate[];
}

const Admin = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  
  // Set default times for new election
  const getDefaultTimes = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() + 1); // Default to 1 hour from now
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // Default to 7 days after start

    // Format to local timezone string
    return {
      startTime: start.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T'),
      endTime: end.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T')
    };
  };

  const [newElection, setNewElection] = useState({
    name: '',
    ...getDefaultTimes()
  });

  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    symbol: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authApi.getSession();
        const isAdmin = await isUserAdmin();
        
        if (!session || !isAdmin) {
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
          // Load elections data
          const electionsData = await electionApi.getSchedule();
          if (electionsData) {
            setElections(electionsData);
            if (electionsData.length > 0) {
              setSelectedElection(electionsData[0]);
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      } finally {
        setIsAuthenticating(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      // First check if wallet is connected
      const walletAddress = localStorage.getItem('wallet_address');
      const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
      
      if (!walletAddress || !adminAddress || walletAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        toast({
          title: "Wallet Required",
          description: "Please connect your admin wallet first",
          variant: "destructive"
        });
        return;
      }

      // Then try to sign in
      await authApi.signIn(adminEmail, adminPassword);
      const isAdmin = await isUserAdmin();
      
      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "This account does not have admin privileges",
          variant: "destructive"
        });
        await authApi.signOut();
        return;
      }

      setIsAuthorized(true);
      toast({
        title: "Welcome Admin",
        description: "Successfully signed in"
      });

      // Load elections data
      const electionsData = await electionApi.getSchedule();
      if (electionsData) {
        setElections(electionsData);
        if (electionsData.length > 0) {
          setSelectedElection(electionsData[0]);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again",
        variant: "destructive"
      });
    }
  };

  const handleElectionUpdate = async () => {
    try {
      if (!newElection.name || !newElection.startTime || !newElection.endTime) {
        toast({
          title: "Missing Information",
          description: "Please fill in all election details",
          variant: "destructive"
        });
        return;
      }

      const startDate = new Date(newElection.startTime);
      const endDate = new Date(newElection.endTime);
      const now = new Date();

      // Convert dates to UTC for storage
      const startUTC = startDate;
      const endUTC = endDate;

      // Validate dates
      if (startDate >= endDate) {
        toast({
          title: "Invalid Dates",
          description: "End time must be after start time",
          variant: "destructive"
        });
        return;
      }

      // Check if start time is too far in the past
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (startDate < yesterday) {
        toast({
          title: "Invalid Start Time",
          description: "Start time cannot be more than 24 hours in the past",
          variant: "destructive"
        });
        return;
      }

      // Use createElection to generate encryption keys and create the election
      await createElection(newElection.name, startUTC, endUTC);
      
      // Refresh elections list
      const updatedElections = await electionApi.getSchedule();
      setElections(updatedElections);
      
      toast({
        title: "Election Created",
        description: "The election has been scheduled successfully",
      });

      // Reset form with new default times
      setNewElection({
        name: '',
        ...getDefaultTimes()
      });
    } catch (error) {
      console.error('Error updating election:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to create election. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddCandidate = async () => {
    try {
      if (!selectedElection) {
        toast({
          title: "No Election Selected",
          description: "Please select an election to add candidates to",
          variant: "destructive"
        });
        return;
      }

      if (!newCandidate.name || !newCandidate.party || !newCandidate.symbol) {
        toast({
          title: "Missing Information",
          description: "Please fill in all candidate details",
          variant: "destructive"
        });
        return;
      }

      await candidateApi.add({
        ...newCandidate,
        electionId: selectedElection.id
      });

      // Refresh elections list to get updated candidates
      const updatedElections = await electionApi.getSchedule();
      setElections(updatedElections);
      
      // Update selected election
      const updatedSelectedElection = updatedElections.find(e => e.id === selectedElection.id);
      if (updatedSelectedElection) {
        setSelectedElection(updatedSelectedElection);
      }

      // Reset form
      setNewCandidate({
        name: "",
        party: "",
        symbol: ""
      });

      toast({
        title: "Candidate Added",
        description: "The candidate has been added successfully",
      });
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast({
        title: "Failed to Add",
        description: error instanceof Error ? error.message : "Could not add the candidate",
        variant: "destructive"
      });
    }
  };

  const handleRemoveCandidate = async (id: string) => {
    try {
      await candidateApi.remove(id);
      
      // Refresh elections list to get updated candidates
      const updatedElections = await electionApi.getSchedule();
      setElections(updatedElections);
      
      // Update selected election
      const updatedSelectedElection = updatedElections.find(e => e.id === selectedElection?.id);
      if (updatedSelectedElection) {
        setSelectedElection(updatedSelectedElection);
      }

      toast({
        title: "Candidate Removed",
        description: "The candidate has been removed successfully",
      });
    } catch (error) {
      console.error('Error removing candidate:', error);
      toast({
        title: "Failed to Remove",
        description: error instanceof Error ? error.message : "Could not remove the candidate",
        variant: "destructive"
      });
    }
  };

  const handleSignUp = async () => {
    try {
      if (adminPassword !== confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match",
          variant: "destructive"
        });
        return;
      }

      if (adminPassword.length < 6) {
        toast({
          title: "Invalid Password",
          description: "Password must be at least 6 characters long",
          variant: "destructive"
        });
        return;
      }

      await authApi.signUp(adminEmail, adminPassword);
      toast({
        title: "Admin Account Created",
        description: "Please check your email for verification link",
      });
      setIsSigningUp(false);
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to create admin account",
        variant: "destructive"
      });
    }
  };

  if (isAuthenticating) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{isSigningUp ? "Create Admin Account" : "Admin Authentication"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              {isSigningUp && (
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-col space-y-2">
                <Button onClick={isSigningUp ? handleSignUp : handleSignIn}>
                  {isSigningUp ? "Create Account" : "Sign In"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsSigningUp(!isSigningUp);
                    setAdminPassword('');
                    setConfirmPassword('');
                  }}
                >
                  {isSigningUp ? "Back to Sign In" : "First Time Setup"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm py-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="bg-[#6B21E8]/10 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-[#6B21E8]" />
              </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Election Management System</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="border-[#6B21E8] text-[#6B21E8] hover:bg-[#6B21E8]/5"
            >
              Exit Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Create Election */}
          <div className="lg:col-span-2">
            <Card className="shadow-md">
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center gap-2 text-gray-900">
              Create New Election
            </CardTitle>
          </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-6">
                  <div>
                <Label htmlFor="electionName">Election Name</Label>
                <Input
                  id="electionName"
                  value={newElection.name}
                  onChange={(e) => setNewElection(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. General Election 2024"
                      className="mt-1"
                />
              </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={newElection.startTime}
                  onChange={(e) => setNewElection(prev => ({ ...prev, startTime: e.target.value }))}
                        className="mt-1"
                />
              </div>
                    <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={newElection.endTime}
                  onChange={(e) => setNewElection(prev => ({ ...prev, endTime: e.target.value }))}
                        className="mt-1"
                />
              </div>
            </div>
                </div>
            <Button 
              onClick={handleElectionUpdate}
                  className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
            >
              Create Election
            </Button>
          </CardContent>
        </Card>
          </div>

          {/* Right Column - Admin Restrictions */}
          <div>
            <Card className="shadow-md bg-white">
              <CardHeader className="border-b">
                <CardTitle className="text-gray-900">
                  Admin Privileges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-red-800 mb-3">Restricted Actions</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span>
                        Cast votes
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span>
                        Access user homepage
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span>
                        View individual votes
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span>
                        Modify submitted votes
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span>
                        Access user DIDs
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800 mb-3">Allowed Actions</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span>
                        Create multiple elections
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span>
                        Set election schedules
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span>
                        Add candidates to elections
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span>
                        Monitor election status
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span>
                        View aggregate statistics
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full Width - Manage Elections */}
          <div className="lg:col-span-3">
            <Card className="shadow-md">
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center gap-2 text-gray-900">
              Manage Elections
            </CardTitle>
          </CardHeader>
              <CardContent className="p-6">
            {elections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                No elections created yet
              </div>
            ) : (
                  <div className="space-y-6">
                <div className="flex items-center gap-4">
                      <Label className="min-w-[120px]">Select Election:</Label>
                  <select
                        className="flex-1 h-10 rounded-md border border-input bg-white px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6B21E8]"
                    value={selectedElection?.id || ''}
                    onChange={(e) => {
                      const election = elections.find(el => el.id === e.target.value);
                      setSelectedElection(election || null);
                    }}
                  >
                    <option value="">Select an election...</option>
                    {elections.map((election) => (
                      <option key={election.id} value={election.id}>
                        {election.name} ({new Date(election.start_time).toLocaleDateString()} - {new Date(election.end_time).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedElection && (
                      <div className="space-y-6">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-2">{selectedElection.name}</h3>
                          <p className="text-sm text-gray-600">
                        Start: {new Date(selectedElection.start_time).toLocaleString()}
                        <br />
                        End: {new Date(selectedElection.end_time).toLocaleString()}
                      </p>
                          <p className="text-xs text-gray-500 mt-2">
                            All times are shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                          </p>
                    </div>

                    {/* Add Candidate Form */}
                    <div className="space-y-4">
                          <h3 className="font-medium text-gray-900">Add New Candidate</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                          <Label htmlFor="candidateName">Name</Label>
                          <Input
                            id="candidateName"
                            value={newCandidate.name}
                            onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Candidate Name"
                                className="mt-1"
                          />
                        </div>
                            <div>
                              <Label htmlFor="candidateParty">Party</Label>
                          <Input
                                id="candidateParty"
                            value={newCandidate.party}
                            onChange={(e) => setNewCandidate(prev => ({ ...prev, party: e.target.value }))}
                            placeholder="Party Name"
                                className="mt-1"
                          />
                        </div>
                            <div>
                              <Label htmlFor="candidateSymbol">Symbol</Label>
                          <Input
                                id="candidateSymbol"
                            value={newCandidate.symbol}
                            onChange={(e) => setNewCandidate(prev => ({ ...prev, symbol: e.target.value }))}
                                placeholder="🌟"
                                className="mt-1"
                          />
                        </div>
                      </div>
                          <Button 
                            onClick={handleAddCandidate}
                            className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
                          >
                        Add Candidate
                      </Button>
                    </div>

                    <div className="space-y-4">
                          <h3 className="font-medium text-gray-900 mb-4">Current Candidates</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedElection.candidates && selectedElection.candidates.length > 0 ? (
                          selectedElection.candidates.map((candidate) => (
                            <div
                              key={candidate.id}
                                  className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 flex items-center justify-center bg-[#6B21E8]/10 rounded-full">
                                      <span className="text-[#6B21E8]">{candidate.symbol}</span>
                                    </div>
                                <div>
                                      <h4 className="font-medium text-gray-900">{candidate.name}</h4>
                                      <p className="text-sm text-gray-600">{candidate.party}</p>
                                </div>
                              </div>
                              <Button
                                    variant="outline"
                                size="icon"
                                onClick={() => handleRemoveCandidate(candidate.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                              <div className="text-center py-8 text-gray-500 bg-slate-50 rounded-lg">
                            No candidates added yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
              </div>
            </div>
      </div>
    </div>
  );
};

export default Admin;
