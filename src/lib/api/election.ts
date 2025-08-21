import { supabase } from '@/lib/supabase';

export const createElection = async (name: string, startTime: Date, endTime: Date) => {
  try {
    const { data: election, error } = await supabase
      .from('elections')
      .insert({
        name,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_active: true,
        total_votes: 0
      })
      .select()
      .single();

    if (error) throw error;

    return election;
  } catch (error) {
    throw error;
  }
};

export const updateElectionTime = async (
  electionId: string,
  startTime: Date,
  endTime: Date
) => {
  try {
    const { data: election, error } = await supabase
      .from('elections')
      .update({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .eq('id', electionId)
      .select()
      .single();

    if (error) throw error;

    return election;
  } catch (error) {
    throw error;
  }
};

export const addCandidate = async (
  electionId: string,
  name: string,
  party: string,
  symbol: string
) => {
  try {
    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        election_id: electionId,
        name,
        party,
        symbol,
        votes: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return candidate;
  } catch (error) {
    throw error;
  }
};

export const getElectionStatus = async () => {
  try {
    const { data: election, error } = await supabase
      .from('elections')
      .select(`
        *,
        candidates (*)
      `)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return {
      isVotingLive: election && new Date() >= new Date(election.start_time) && new Date() <= new Date(election.end_time),
      hasVotingEnded: election && new Date() > new Date(election.end_time),
      startTime: election?.start_time ? new Date(election.start_time) : null,
      endTime: election?.end_time ? new Date(election.end_time) : null,
      candidates: election?.candidates || [],
    };
  } catch (error) {
    throw error;
  }
};

export const getElectionStats = async () => {
  try {
    const { data: election, error } = await supabase
      .from('elections')
      .select(`
        *,
        candidates (*)
      `)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    const { data: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    const { data: totalVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })
      .eq('election_id', election.id);

    const turnoutPercentage = Number(totalVotes || 0) / Number(totalUsers || 1) * 100;

    return {
      totalRegistered: totalUsers || 0,
      totalVotes: totalVotes || 0,
      turnoutPercentage,
      candidates: election.candidates,

      electionPeriod: {
        start: election.start_time,
        end: election.end_time,
      },
    };
  } catch (error) {
    throw error;
  }
}; 

interface ElectionCandidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  votes?: number;
}

interface ElectionData {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  total_votes: number | null;
  total_registered: number | null;

  candidates: ElectionCandidate[];
}

export const getPastElections = async () => {
  try {
    const now = new Date().toISOString();
    const { data: elections, error } = await supabase
      .from('elections')
      .select(`
        *,
        candidates (*)
      `)
      .lt('end_time', now)
      .order('end_time', { ascending: false });

    if (error) throw error;

            
    return (elections as ElectionData[]).map(election => {
      const totalVotes = Number(election.total_votes || 0);
      const totalRegistered = Number(election.total_registered || 0);
      const turnoutPercentage = totalRegistered > 0 ? (totalVotes / totalRegistered) * 100 : 0;

      return {
        id: election.id,
        name: election.name,
        totalVotes,
        totalRegistered,
        turnoutPercentage: Math.round(turnoutPercentage),
        candidates: election.candidates.map((candidate: ElectionCandidate) => {
          const votes = Number(candidate.votes || 0);
          return {
            id: candidate.id,
            name: candidate.name,
            party: candidate.party,
            symbol: candidate.symbol,
            votes,
            percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          };
        }),

        electionPeriod: {
          start: election.start_time,
          end: election.end_time
        }
      };
    });
  } catch (error) {
    console.error('Error fetching past elections:', error);
    return [];
  }
}; 

export const getElectionProgress = (startTime: string, endTime: string): number => {
  const startMs = new Date(startTime).valueOf();
  const endMs = new Date(endTime).valueOf();
  const nowMs = Date.now();

  if (nowMs < startMs) return 0;
  if (nowMs > endMs) return 100;

  const totalMs = endMs - startMs;
  const elapsedMs = nowMs - startMs;
  return Math.round((elapsedMs / totalMs) * 100);
}; 