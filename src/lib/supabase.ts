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

// Set organization context for multi-tenant queries
export const setOrganizationContext = async (organizationId: string) => {
  try {
    await supabase.rpc('set_organization_context', { org_id: organizationId });
  } catch (error) {
    console.error('Failed to set organization context:', error);
  }
};

// Get current organization context
export const getCurrentOrganization = async () => {
  try {
    const { data, error } = await supabase.rpc('get_current_organization');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get organization context:', error);
    return null;
  }
};

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

// Auth functions
export const authApi = {
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_admin: true
          }
        }
      });
      if (error) throw handleSupabaseError(error);
      return data;
    } catch (error) {
      throw handleSupabaseError(error);
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw handleSupabaseError(error);
      
      // Store the session
      if (data.session) {
        localStorage.setItem('supabase.auth.token', data.session.access_token);
      }
      return data;
    } catch (error) {
      throw handleSupabaseError(error);
    }
  },

  async signOut() {
    localStorage.removeItem('supabase.auth.token');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};

// Helper to check admin status
export const isUserAdmin = async () => {
  try {
    // First check wallet address
    const walletAddress = localStorage.getItem('wallet_address');
    const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
    
    if (!walletAddress || !adminAddress || walletAddress.toLowerCase() !== adminAddress.toLowerCase()) {
      return false;
    }

    // Then check if we have a valid Supabase session
    const session = await authApi.getSession();
    return !!session;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Set the current wallet address for RLS policies
export const setCurrentWalletAddress = async (address: string) => {
  try {
    console.log('Setting wallet address:', address);
    const { data, error } = await supabase.functions.invoke('set-wallet-address', {
      body: { address: address.toLowerCase() }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data?.success) {
      console.error('Function response:', data);
      throw new Error(data?.message || 'Failed to set wallet address');
    }

    console.log('Wallet address set successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to set wallet address:', error);
    throw error;
  }
};

// Check if address is admin
export const checkIsAdmin = async (address: string) => {
  try {
    console.log('Checking admin status for:', address);
    const { data, error } = await supabase
      .from('admin_addresses')
      .select('address')
      .eq('address', address.toLowerCase())
      .single();

    if (error) {
      console.error('Admin check error:', error);
      return false;
    }

    console.log('Admin check result:', data);
    return !!data;
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
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
  total_votes: number | null;
  total_registered: number | null;
  merkle_root?: string;
  candidates: ElectionCandidate[];
}

// Election-related functions
export const electionApi = {
  async setSchedule(electionData: { name: string; startTime: string; endTime: string }) {
    try {
      // Check if we have a valid session
      const session = await authApi.getSession();
      if (!session) {
        throw new Error('Please sign in as admin first');
      }

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

      // Insert the election with authorization header
      const { data: election, error: electionError } = await supabase
        .from('elections')
        .insert([{ 
          name: electionData.name,
          start_time: electionData.startTime,
          end_time: electionData.endTime,
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

  async getSchedule() {
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
        `);

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

  async getActiveElections() {
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

  async getStats(): Promise<Array<{
    election_id: string;
    name: string;
    start_time: string;
    end_time: string;
    registered_voters: number;
    total_votes: number;
    participation_rate: number;
    avg_confirmation_time: number;
    security_score: number;
  }>> {
    const { data: stats, error } = await supabase
      .from('election_stats')
      .select('*');

    if (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }

    return stats || [];
  },

  async getPastElections() {
    try {
      const now = new Date().toISOString();
      const { data: elections, error } = await supabase
        .from('elections')
        .select(`
          *,
          candidates (*)
        `)
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
        // Live count of registered users
        const { count: totalRegistered } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
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
        const turnoutPercentage = (totalRegistered || 0) > 0 ? (totalVotes || 0) / (totalRegistered || 1) * 100 : 0;
        return {
          id: election.id,
          name: election.name,
          totalVotes: totalVotes || 0,
          totalRegistered: totalRegistered || 0,
          turnoutPercentage: Math.round(turnoutPercentage),
          candidates,
          merkleRoot: election.merkle_root || '',
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
      // Check if we have a valid session
      const session = await authApi.getSession();
      if (!session) {
        throw new Error('Please sign in as admin first');
      }

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
      // Check if we have a valid session
      const session = await authApi.getSession();
      if (!session) {
        throw new Error('Please sign in as admin first');
      }

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