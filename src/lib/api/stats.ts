import { supabase } from '@/lib/supabase';

export interface PlatformStats {
  totalVotes: number;
  totalUsers: number;
  activeElections: number;
  totalElections: number;
}

export const fetchPlatformStats = async (): Promise<PlatformStats> => {
  try {
    // Get total registered users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    // Get total votes across all elections
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true });

    // Get truly active elections count (is_active = true AND end_time >= now)
    const now = new Date().toISOString();
    const { count: activeElections } = await supabase
      .from('elections')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('end_time', now);

    // Get total elections count
    const { count: totalElections } = await supabase
      .from('elections')
      .select('id', { count: 'exact', head: true });

    return {
      totalVotes: totalVotes || 0,
      totalUsers: totalUsers || 0,
      activeElections: activeElections || 0,
      totalElections: totalElections || 0
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    // Return default values on error
    return {
      totalVotes: 0,
      totalUsers: 0,
      activeElections: 0,
      totalElections: 0
    };
  }
};

export const fetchTodayStats = async (): Promise<{ votesToday: number; usersToday: number }> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get votes cast today
    const { count: votesToday } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    // Get users registered today
    const { count: usersToday } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    return {
      votesToday: votesToday || 0,
      usersToday: usersToday || 0
    };
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return {
      votesToday: 0,
      usersToday: 0
    };
  }
}; 