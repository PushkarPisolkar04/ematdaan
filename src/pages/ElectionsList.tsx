import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { electionApi } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Vote, Trophy, Clock, AlertCircle } from 'lucide-react';

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const ElectionsList: React.FC = () => {
  const { user, organization, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchElections = async () => {
      try {
        if (!organization?.id) {
          setElections([]);
          return;
        }

        const data = await electionApi.getSchedule(organization.id);
        setElections(data || []);
      } catch (error) {
        console.error('Failed to fetch elections:', error);
        setElections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, [isAuthenticated, organization, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#6B21E8]" />
          <p className="text-gray-600">Loading elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Elections</h1>
          <p className="text-xl text-gray-600">Select an election to view results or verify votes</p>
        </div>

        {elections.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Elections Found</h3>
            <p className="text-gray-600 mb-6">
              There are no elections available in your organization yet.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="bg-[#6B21E8] hover:bg-[#6B21E8]/90">
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map((election) => {
              const now = new Date();
              const startTime = new Date(election.start_time);
              const endTime = new Date(election.end_time);
              
              let status = 'upcoming';
              let statusColor = 'bg-blue-100 text-blue-800';
              
              if (now >= startTime && now <= endTime) {
                status = 'active';
                statusColor = 'bg-green-100 text-green-800';
              } else if (now > endTime) {
                status = 'completed';
                statusColor = 'bg-gray-100 text-gray-800';
              }

              return (
                <Card key={election.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{election.name}</CardTitle>
                      <Badge className={statusColor}>
                        {status === 'active' && <Clock className="w-3 h-3 mr-1" />}
                        {status === 'completed' && <Trophy className="w-3 h-3 mr-1" />}
                        {status === 'upcoming' && <Vote className="w-3 h-3 mr-1" />}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {startTime.toLocaleDateString()} - {endTime.toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {status === 'active' && (
                        <Button 
                          onClick={() => navigate(`/vote/${election.id}`)}
                          className="flex-1 bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                        >
                          <Vote className="w-4 h-4 mr-2" />
                          Vote
                        </Button>
                      )}
                      {(status === 'completed' || status === 'active') && (
                        <Button 
                          onClick={() => navigate(`/results/${election.id}`)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          Results
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionsList; 