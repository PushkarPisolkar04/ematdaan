import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Prefer': 'return=minimal'
    }
  }
});

// Helper function to handle API responses
const handleApiResponse = async <T>(promise: Promise<{ data: T; error: any }>) => {
  try {
    const response = await promise;
    if (response.error) {
      console.error('API Error:', response.error);
      throw response.error;
    }
    return response.data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
};

// Error handling function
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);

  if (error?.message?.includes('Project not specified')) {
    return new Error('Invalid Supabase configuration. Please check your environment variables.');
  }

  if (error?.message?.includes('Failed to fetch')) {
    return new Error('Network error. Please check your connection and try again.');
  }

  if (error?.code === 'PGRST301') {
    return new Error('Database row level security policy violation');
  }

  if (error?.code === 'PGRST204') {
    return new Error('Invalid API key or unauthorized access');
  }

  return error;
};

interface ElectionCandidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  votes?: number;
}

interface DatabaseElection {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  organization_id: string;
  candidates: ElectionCandidate[];
}

// Election-related functions
export const electionApi = {
  async setSchedule(electionData: { name: string; startTime: string; endTime: string; organizationId: string }) {
    try {
      // Validate dates
      const startDate = new Date(electionData.startTime);
      const endDate = new Date(electionData.endTime);
      const now = new Date();
      
      if (startDate >= endDate) {
        throw new Error('End time must be after start time');
      }

      // Allow start times within the next 24 hours
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (startDate < yesterday) {
        throw new Error('Start time cannot be more than 24 hours in the past');
      }

      // Get current user from localStorage to set context
      const userDataStr = localStorage.getItem('user_data');
      if (!userDataStr) {
        throw new Error('User session not found. Please log in again.');
      }
      
      const userData = JSON.parse(userDataStr);
      
      console.log('Setting user context for user:', userData.id);
      console.log('Setting organization context for org:', electionData.organizationId);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
      
      // Set user context for RLS policies
      const { error: userContextError } = await supabase.rpc('set_user_context', {
        p_user_id: userData.id
      });
      
      if (userContextError) {
        console.error('Failed to set user context:', userContextError);
      }

      // Set organization context for RLS policies
      const { error: orgContextError } = await supabase.rpc('set_organization_context', {
        p_organization_id: electionData.organizationId
      });
      
      if (orgContextError) {
        console.error('Failed to set organization context:', orgContextError);
      }

      // Insert the election
      const { data: election, error: electionError } = await supabase
        .from('elections')
        .insert([{ 
          name: electionData.name,
          start_time: electionData.startTime,
          end_time: electionData.endTime,
          organization_id: electionData.organizationId,
          is_active: true
        }])
        .select('*')
        .single();

      if (electionError) {
        console.error('Election creation error:', electionError);
        throw new Error(electionError.message || 'Failed to create election');
      }

      return election;
    } catch (error) {
      console.error('Failed to set election schedule:', error);
      throw error;
    }
  },

  async getSchedule(organizationId: string) {
    try {
      // Get current user from localStorage to set context
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // Set user context for RLS policies
        await supabase.rpc('set_user_context', {
          p_user_id: userData.id
        });
      }

      // Set organization context for RLS policies
      await supabase.rpc('set_organization_context', {
        p_organization_id: organizationId
      });

      const { data, error } = await supabase
        .from('elections')
        .select(`
          *,
          candidates (
            id,
            name,
            party,
            symbol
          )
        `)
        .eq('organization_id', organizationId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Get schedule error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to get election schedule:', error);
      throw error;
    }
  },

  async getActiveElections(organizationId: string) {
    try {
      // If organizationId is empty, return empty array
      if (!organizationId || organizationId.trim() === '') {
        return [];
      }

      // Get current user from localStorage to set context
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // Set user context for RLS policies
        await supabase.rpc('set_user_context', {
          p_user_id: userData.id
        });
      }

      // Set organization context for RLS policies
      await supabase.rpc('set_organization_context', {
        p_organization_id: organizationId
      });

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('elections')
        .select(`
          id,
          name,
          start_time,
          end_time,
          is_active,
          candidates (
            id,
            name,
            party,
            symbol
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .gte('end_time', now);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to fetch active elections: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data;
    } catch (error) {
      console.error('Failed to get active elections:', error);
      throw error;
    }
  },

  async getPastElections(organizationId: string) {
    try {
      // Get current user from localStorage to set context
      const userDataStr = localStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // Set user context for RLS policies
        await supabase.rpc('set_user_context', {
          p_user_id: userData.id
        });
      }

      // Set organization context for RLS policies
      await supabase.rpc('set_organization_context', {
        p_organization_id: organizationId
      });

      const now = new Date().toISOString();
      const { data: elections, error } = await supabase
        .from('elections')
        .select(`
          *,
          candidates (*)
        `)
        .eq('organization_id', organizationId)
        .or(`end_time.lt.${now},is_active.eq.true`)
        .order('end_time', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to fetch past elections: ${error.message}`);
      }

      if (!elections) {
        return [];
      }

      // For each election, fetch live stats
      const results = await Promise.all((elections as DatabaseElection[]).map(async (election) => {
        // Live count of votes for this election
        const { count: totalVotes } = await supabase
          .from('votes')
          .select('id', { count: 'exact', head: true })
          .eq('election_id', election.id);
        
        // For each candidate, count votes
        const candidates = await Promise.all((election.candidates || []).map(async (candidate: ElectionCandidate) => {
          const { count: candidateVotes } = await supabase
            .from('votes')
            .select('id', { count: 'exact', head: true })
            .eq('election_id', election.id)
            .eq('candidate_id', candidate.id);
          return {
            id: candidate.id,
            name: candidate.name,
            party: candidate.party,
            symbol: candidate.symbol,
            votes: candidateVotes || 0,
            percentage: (totalVotes || 0) > 0 ? Math.round(((candidateVotes || 0) / (totalVotes || 1)) * 100) : 0
          };
        }));
        
        return {
          id: election.id,
          name: election.name,
          totalVotes: totalVotes || 0,
          candidates,
          electionPeriod: {
            start: election.start_time,
            end: election.end_time
          }
        };
      }));
      return results;
    } catch (error) {
      console.error('Failed to get past elections:', error);
      throw error;
    }
  }
};

// Candidate-related functions
export const candidateApi = {
  async add(candidate: { name: string; party: string; symbol: string; electionId: string }) {
    try {
      // First verify the election exists and is active
      const { data: election, error: electionError } = await supabase
        .from('elections')
        .select('id')
        .eq('id', candidate.electionId)
        .single();

      if (electionError || !election) {
        throw new Error('Election not found or access denied');
      }

      const { data, error } = await supabase
        .from('candidates')
        .insert([{
          name: candidate.name,
          party: candidate.party,
          symbol: candidate.symbol,
          election_id: candidate.electionId
        }])
        .select()
        .single();

      if (error) {
        console.error('Add candidate error:', error);
        if (error.code === '42501') {
          throw new Error('You do not have permission to add candidates. Please check your admin access.');
        }
        throw new Error('Failed to add candidate. Please try again.');
      }

      return data;
    } catch (error) {
      console.error('Failed to add candidate:', error);
      throw error;
    }
  },

  async remove(id: string) {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Remove candidate error:', error);
        if (error.code === '42501') {
          throw new Error('You do not have permission to remove candidates. Please check your admin access.');
        }
        throw new Error('Failed to remove candidate. Please try again.');
      }

      return true;
    } catch (error) {
      console.error('Failed to remove candidate:', error);
      throw error;
    }
  },

  async getAll(electionId?: string) {
    try {
      let query = supabase
        .from('candidates')
        .select(`
          id,
          name,
          party,
          symbol,
          election_id
        `);
      
      if (electionId) {
        query = query.eq('election_id', electionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Get candidates error:', error);
        throw new Error('Failed to fetch candidates. Please try again.');
      }

      return data;
    } catch (error) {
      console.error('Failed to get candidates:', error);
      throw error;
    }
  }
};

// Voting functions
export const votingApi = {
  async castVote(voteData: { candidateId: string; electionId: string; userId: string }) {
    try {
      const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/votes/cast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cast vote');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  },

  async hasVoted(userId: string, electionId: string) {
    try {
      const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/votes/has-voted/${userId}/${electionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check voting status');
      }

      const result = await response.json();
      return result.hasVoted;
    } catch (error) {
      console.error('Failed to check vote status:', error);
      throw error;
    }
  },

  async getBulkVotingStatus(userId: string, electionIds: string[]) {
    try {
      const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/votes/bulk-voting-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, electionIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check bulk voting status');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to check bulk voting status:', error);
      throw error;
    }
  },

  async getVoteResults(electionId: string) {
    try {
      const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/api/votes/results/${electionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get vote results');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get vote results:', error);
      throw error;
    }
  }
}; 