import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
const router = express.Router();
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xpcemfyksgaxthzzdwiv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey || 'invalid_key_will_cause_error');

// Get global platform statistics
router.get('/platform', async (req, res) => {
  try {
    // Get total registered users (from auth_users table)
    const { count: totalUsers } = await supabase
      .from('auth_users')
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

    // Get completed elections count (end_time < now)
    const { count: completedElections } = await supabase
      .from('elections')
      .select('id', { count: 'exact', head: true })
      .lt('end_time', now);

    res.json({
      totalVotes: totalVotes || 0,
      totalUsers: totalUsers || 0,
      activeElections: activeElections || 0,
      totalElections: completedElections || 0
    });

  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's statistics
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get votes cast today
    const { count: votesToday } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    // Get users registered today (from auth_users table)
    const { count: usersToday } = await supabase
      .from('auth_users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO);

    res.json({
      votesToday: votesToday || 0,
      usersToday: usersToday || 0
    });

  } catch (error) {
    console.error('Error fetching today stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 