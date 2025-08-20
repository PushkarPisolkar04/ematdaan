import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
      // Check if user has already voted in this election
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', voteData.userId)
        .eq('election_id', voteData.electionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingVote) {
        throw new Error('You have already voted in this election');
      }

      // Create vote hash (in a real app, this would be more complex)
      const voteHash = `${voteData.userId}-${voteData.electionId}-${Date.now()}`;

      // Insert the vote
      const { data, error } = await supabase
        .from('votes')
        .insert([{
          candidate_id: voteData.candidateId,
          user_id: voteData.userId,
          election_id: voteData.electionId,
          vote_hash: voteHash
        }])
        .select()
        .single();

      if (error) {
        console.error('Vote casting error:', error);
        throw new Error('Failed to cast vote. Please try again.');
      }

      return data;
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  },

  async hasVoted(userId: string, electionId: string) {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', userId)
        .eq('election_id', electionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check vote status:', error);
      throw error;
    }
  },

  async getVoteResults(electionId: string) {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select(`
          candidate_id,
          candidates (
            id,
            name,
            party,
            symbol
          )
        `)
        .eq('election_id', electionId);

      if (error) {
        throw error;
      }

      // Count votes per candidate
      const voteCounts = data?.reduce((acc: any, vote) => {
        const candidateId = vote.candidate_id;
        if (!acc[candidateId]) {
          acc[candidateId] = {
            candidate: vote.candidates,
            votes: 0
          };
        }
        acc[candidateId].votes++;
        return acc;
      }, {});

      return Object.values(voteCounts || {});
    } catch (error) {
      console.error('Failed to get vote results:', error);
      throw error;
    }
  }
}; 