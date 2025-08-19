import { supabase } from './supabase';

export interface UserActivity {
  id: string;
  user_id: string;
  organization_id: string | null;
  activity_type: string;
  activity_details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  created_at: string;
}

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'page_visit'
  | 'vote_cast'
  | 'profile_update'
  | 'password_change'
  | 'election_view'
  | 'results_view'
  | 'admin_action'
  | 'mfa_verification'
  | 'session_timeout';

// Get client information
const getClientInfo = () => {
  return {
    ip_address: null, // In production, this would be obtained from server
    user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    timestamp: new Date().toISOString()
  };
};

// Track user activity
export const trackUserActivity = async (
  userId: string,
  activityType: ActivityType,
  activityDetails: Record<string, any> = {},
  organizationId: string | null = null
): Promise<void> => {
  try {
    const clientInfo = getClientInfo();
    
    const activity = {
      user_id: userId,
      organization_id: organizationId,
      activity_type: activityType,
      activity_details: activityDetails,
      ip_address: clientInfo.ip_address,
      user_agent: clientInfo.user_agent,
      timestamp: clientInfo.timestamp
    };

    const { error } = await supabase
      .from('user_activities')
      .insert(activity);

    if (error) {
      console.error('Failed to track user activity:', error);
    }

  } catch (error) {
    console.error('User activity tracking failed:', error);
  }
};

// Update user's last login
export const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('users')
      .update({ 
        last_login_at: now,
        updated_at: now
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update last login:', error);
    }

    // Track login activity
    await trackUserActivity(userId, 'login', {
      login_method: 'email_password',
      success: true
    });

  } catch (error) {
    console.error('Last login update failed:', error);
  }
};

// Track page visits
export const trackPageVisit = async (
  userId: string,
  pageName: string,
  pageUrl: string,
  organizationId: string | null = null
): Promise<void> => {
  await trackUserActivity(userId, 'page_visit', {
    page_name: pageName,
    page_url: pageUrl,
    referrer: typeof window !== 'undefined' ? document.referrer : null
  }, organizationId);
};

// Track logout
export const trackLogout = async (userId: string, reason: string = 'manual'): Promise<void> => {
  await trackUserActivity(userId, 'logout', {
    logout_reason: reason,
    session_duration: 'calculated_on_server' // Would be calculated in production
  });
};

// Get user activity history
export const getUserActivityHistory = async (
  userId: string,
  limit: number = 50,
  activityType?: ActivityType
): Promise<UserActivity[]> => {
  try {
    let query = supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error('Failed to get user activity history:', error);
    throw new Error('Failed to retrieve user activity history');
  }
};

// Get user statistics
export const getUserStats = async (userId: string): Promise<{
  totalActivities: number;
  lastLogin: string | null;
  mostActiveDay: string;
  topActivities: Array<{ activity_type: string; count: number }>;
  loginCount: number;
  sessionCount: number;
}> => {
  try {
    // Get all activities for the user
    const { data: activities, error } = await supabase
      .from('user_activities')
      .select('activity_type, timestamp')
      .eq('user_id', userId);

    if (error) throw error;

    const totalActivities = activities?.length || 0;
    
    // Get last login from user table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('last_login_at')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const lastLogin = userData?.last_login_at || null;

    // Calculate activity counts
    const activityCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    let loginCount = 0;

    activities?.forEach(activity => {
      // Count activity types
      activityCounts[activity.activity_type] = (activityCounts[activity.activity_type] || 0) + 1;
      
      // Count logins
      if (activity.activity_type === 'login') {
        loginCount++;
      }
      
      // Count daily activities
      const day = new Date(activity.timestamp).toDateString();
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    // Find most active day
    const mostActiveDay = Object.entries(dailyCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No activity';

    // Get top activities
    const topActivities = Object.entries(activityCounts)
      .map(([activity_type, count]) => ({ activity_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalActivities,
      lastLogin,
      mostActiveDay,
      topActivities,
      loginCount,
      sessionCount: loginCount // Simplified - would be calculated differently in production
    };

  } catch (error) {
    console.error('Failed to get user stats:', error);
    throw new Error('Failed to retrieve user statistics');
  }
};

// Get organization activity summary
export const getOrganizationActivitySummary = async (
  organizationId: string,
  timeRange: 'day' | 'week' | 'month' = 'week'
): Promise<{
  totalActivities: number;
  activeUsers: number;
  topActivities: Array<{ activity_type: string; count: number }>;
  activityTrend: Array<{ date: string; count: number }>;
}> => {
  try {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const { data: activities, error } = await supabase
      .from('user_activities')
      .select('user_id, activity_type, timestamp')
      .eq('organization_id', organizationId)
      .gte('timestamp', startDate.toISOString());

    if (error) throw error;

    const totalActivities = activities?.length || 0;
    const uniqueUsers = new Set(activities?.map(a => a.user_id)).size;
    
    // Count activity types
    const activityCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    activities?.forEach(activity => {
      activityCounts[activity.activity_type] = (activityCounts[activity.activity_type] || 0) + 1;
      
      const day = new Date(activity.timestamp).toDateString();
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    const topActivities = Object.entries(activityCounts)
      .map(([activity_type, count]) => ({ activity_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const activityTrend = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalActivities,
      activeUsers: uniqueUsers,
      topActivities,
      activityTrend
    };

  } catch (error) {
    console.error('Failed to get organization activity summary:', error);
    throw new Error('Failed to retrieve organization activity summary');
  }
}; 