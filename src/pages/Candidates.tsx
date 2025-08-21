import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Edit, ArrowLeft, User, Vote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { electionApi } from '@/lib/electionApi';
import { candidateApi } from '@/lib/candidateApi';

interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  election_id: string;
  created_at: string;
}

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const Candidates: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { user, organization, isAuthenticated, userRole } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null);
  
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    party: '',
    symbol: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    party: '',
    symbol: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (userRole !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to manage candidates",
        variant: "destructive"
      });
      navigate('/admin');
      return;
    }

    if (electionId) {
      loadElectionAndCandidates();
    }
  }, [isAuthenticated, userRole, electionId]);

  const loadElectionAndCandidates = async () => {
    if (!electionId || !organization?.id) return;

    try {
      setLoading(true);

      try {
        const electionData = await electionApi.getElection(electionId);
        setElection(electionData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Election not found",
          variant: "destructive"
        });
        navigate('/admin');
        return;
      }

      try {
        const candidatesData = await candidateApi.getCandidates(electionId);
        setCandidates(candidatesData || []);
      } catch (error) {
        console.error('Failed to load candidates:', error);
        toast({
          title: "Error",
          description: "Failed to load candidates",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to load election and candidates:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCandidate.name || !newCandidate.party || !newCandidate.symbol) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const healthResponse = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!healthResponse.ok) {
        toast({
          title: "Server Error",
          description: "Server is not available. Please try again later.",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Server Error",
        description: "Cannot connect to server. Please check if the server is running.",
        variant: "destructive"
      });
      return;
    }

    try {
      const data = await candidateApi.createCandidate({
        name: newCandidate.name,
        party: newCandidate.party,
        symbol: newCandidate.symbol,
        electionId: electionId
      });

      setCandidates([...candidates, data]);
      setNewCandidate({ name: '', party: '', symbol: '' });

      toast({
        title: "Success",
        description: "Candidate added successfully"
      });
    } catch (error) {
      console.error('Failed to add candidate:', error);
      toast({
        title: "Error",
        description: "Failed to add candidate",
        variant: "destructive"
      });
    }
  };

  const handleEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCandidate || !editForm.name || !editForm.party || !editForm.symbol) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const data = await candidateApi.updateCandidate(editingCandidate, {
        name: editForm.name,
        party: editForm.party,
        symbol: editForm.symbol
      });

      setCandidates(candidates.map(c => c.id === editingCandidate ? data : c));
      setEditingCandidate(null);
      setEditForm({ name: '', party: '', symbol: '' });

      toast({
        title: "Success",
        description: "Candidate updated successfully"
      });
    } catch (error) {
      console.error('Failed to update candidate:', error);
      toast({
        title: "Error",
        description: "Failed to update candidate",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
      return;
    }

    try {
      await candidateApi.deleteCandidate(candidateId);

      setCandidates(candidates.filter(c => c.id !== candidateId));

      toast({
        title: "Success",
        description: "Candidate deleted successfully"
      });
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive"
      });
    }
  };

  const startEditing = (candidate: Candidate) => {
    setEditingCandidate(candidate.id);
    setEditForm({
      name: candidate.name,
      party: candidate.party,
      symbol: candidate.symbol
    });
  };

  const cancelEditing = () => {
    setEditingCandidate(null);
    setEditForm({ name: '', party: '', symbol: '' });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#6B21E8]" />
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/admin')}
            variant="ghost"
            className="mb-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-purple-100 p-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Manage Candidates
              </h1>
              {election && (
                <p className="text-base text-gray-600">
                  Election: <span className="font-semibold text-purple-600">{election.name}</span>
                </p>
              )}
            </div>
            
            <Button
              onClick={() => setIsAddingCandidate(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg h-10 px-5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        </div>

        {isAddingCandidate && (
          <Card className="mb-8 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
              <CardTitle className="text-lg text-purple-800">Add New Candidate</CardTitle>
              <CardDescription className="text-sm text-purple-600">
                Enter the candidate's information
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddCandidate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-sm text-purple-700 font-semibold">Name</Label>
                    <Input
                      id="name"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      placeholder="Candidate name"
                      className="h-10 border-purple-200 focus:border-purple-500 focus:ring-purple-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="party" className="text-sm text-purple-700 font-semibold">Party</Label>
                    <Input
                      id="party"
                      value={newCandidate.party}
                      onChange={(e) => setNewCandidate({ ...newCandidate, party: e.target.value })}
                      placeholder="Political party"
                      className="h-10 border-purple-200 focus:border-purple-500 focus:ring-purple-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="symbol" className="text-sm text-purple-700 font-semibold">Symbol</Label>
                    <Input
                      id="symbol"
                      value={newCandidate.symbol}
                      onChange={(e) => setNewCandidate({ ...newCandidate, symbol: e.target.value })}
                      placeholder="Party symbol"
                      className="h-10 border-purple-200 focus:border-purple-500 focus:ring-purple-500 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white h-10 px-5">
                    Add Candidate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingCandidate(false)}
                    className="border-purple-200 text-purple-600 hover:bg-purple-50 h-10 px-5"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg text-gray-800">{candidate.name}</CardTitle>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(candidate)}
                      className="border-purple-200 text-purple-600 hover:bg-purple-50 h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCandidate(candidate.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingCandidate === candidate.id ? (
                  <form onSubmit={handleEditCandidate} className="space-y-4">
                    <div>
                      <Label htmlFor={`edit-name-${candidate.id}`} className="text-xs font-semibold">Name</Label>
                      <Input
                        id={`edit-name-${candidate.id}`}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="h-8 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-party-${candidate.id}`} className="text-xs font-semibold">Party</Label>
                      <Input
                        id={`edit-party-${candidate.id}`}
                        value={editForm.party}
                        onChange={(e) => setEditForm({ ...editForm, party: e.target.value })}
                        className="h-8 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-symbol-${candidate.id}`} className="text-xs font-semibold">Symbol</Label>
                      <Input
                        id={`edit-symbol-${candidate.id}`}
                        value={editForm.symbol}
                        onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value })}
                        className="h-8 text-sm"
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 h-8 text-xs">
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <Vote className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">{candidate.party}</span>
                    </div>
                    <div>
                      <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200 text-xs px-2 py-1">
                        {candidate.symbol}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {candidates.length === 0 && !isAddingCandidate && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-purple-100">
            <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <User className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Candidates Yet</h3>
            <p className="text-base text-gray-600 mb-6">
              Start by adding candidates to this election.
            </p>
            <Button
              onClick={() => setIsAddingCandidate(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg h-10 px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Candidate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Candidates; 