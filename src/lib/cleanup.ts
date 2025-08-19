import { supabase } from './supabase';

interface CleanupResult {
  sessions_cleaned: number;
  tokens_cleaned: number;
  otps_cleaned: number;
  password_resets_cleaned: number;
  total_cleaned: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

interface CleanupStats {
  operation_type: string;
  total_runs: number;
  total_records_cleaned: number;
  avg_execution_seconds: number;
  last_run: string;
  failed_runs: number;
}

/**
 * Run all cleanup operations using the database functions
 */
export const runCleanupOperations = async (): Promise<CleanupResult> => {
  try {
    const { data, error } = await supabase.rpc('run_all_cleanup_operations');
    
    if (error) {
      console.error('Cleanup operations failed:', error);
      return {
        sessions_cleaned: 0,
        tokens_cleaned: 0,
        otps_cleaned: 0,
        password_resets_cleaned: 0,
        total_cleaned: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };
    }

    return {
      ...data,
      success: true
    };
  } catch (error) {
    console.error('Cleanup operations error:', error);
    return {
      sessions_cleaned: 0,
      tokens_cleaned: 0,
      otps_cleaned: 0,
      password_resets_cleaned: 0,
      total_cleaned: 0,
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Clean up expired sessions only
 */
export const cleanupExpiredSessions = async (): Promise<{ cleaned: number; success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_sessions_with_log');
    
    if (error) {
      console.error('Session cleanup failed:', error);
      return { cleaned: 0, success: false, error: error.message };
    }

    return { cleaned: data || 0, success: true };
  } catch (error) {
    console.error('Session cleanup error:', error);
    return { 
      cleaned: 0, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Clean up expired access tokens only
 */
export const cleanupExpiredTokens = async (): Promise<{ cleaned: number; success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_tokens_with_log');
    
    if (error) {
      console.error('Token cleanup failed:', error);
      return { cleaned: 0, success: false, error: error.message };
    }

    return { cleaned: data || 0, success: true };
  } catch (error) {
    console.error('Token cleanup error:', error);
    return { 
      cleaned: 0, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Clean up expired OTPs only
 */
export const cleanupExpiredOTPs = async (): Promise<{ cleaned: number; success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_otps_with_log');
    
    if (error) {
      console.error('OTP cleanup failed:', error);
      return { cleaned: 0, success: false, error: error.message };
    }

    return { cleaned: data || 0, success: true };
  } catch (error) {
    console.error('OTP cleanup error:', error);
    return { 
      cleaned: 0, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Get cleanup statistics and status
 */
export const getCleanupStats = async (): Promise<{ stats: CleanupStats[]; success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('cleanup_status')
      .select('*');
    
    if (error) {
      console.error('Failed to get cleanup stats:', error);
      return { stats: [], success: false, error: error.message };
    }

    return { stats: data || [], success: true };
  } catch (error) {
    console.error('Cleanup stats error:', error);
    return { 
      stats: [], 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Get recent cleanup logs
 */
export const getCleanupLogs = async (limit: number = 50): Promise<{ 
  logs: any[]; 
  success: boolean; 
  error?: string 
}> => {
  try {
    const { data, error } = await supabase
      .from('cleanup_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to get cleanup logs:', error);
      return { logs: [], success: false, error: error.message };
    }

    return { logs: data || [], success: true };
  } catch (error) {
    console.error('Cleanup logs error:', error);
    return { 
      logs: [], 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Cleanup service that can be called periodically
 * This should be called from a background job or scheduled task
 */
export class CleanupService {
  private static instance: CleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  /**
   * Start automatic cleanup with specified interval (in minutes)
   */
  startAutoCleanup(intervalMinutes: number = 60): void {
    if (this.cleanupInterval) {
      this.stopAutoCleanup();
    }

    console.log(`Starting auto cleanup with ${intervalMinutes} minute interval`);
    
    // Run immediately
    this.runCleanup();
    
    // Then run at intervals
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Auto cleanup stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      console.log('Cleanup already running, skipping...');
      return {
        sessions_cleaned: 0,
        tokens_cleaned: 0,
        otps_cleaned: 0,
        password_resets_cleaned: 0,
        total_cleaned: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: 'Cleanup already running'
      };
    }

    this.isRunning = true;
    
    try {
      console.log('Running cleanup operations...');
      const result = await runCleanupOperations();
      
      if (result.success) {
        console.log('Cleanup completed:', {
          sessions: result.sessions_cleaned,
          tokens: result.tokens_cleaned,
          otps: result.otps_cleaned,
          password_resets: result.password_resets_cleaned,
          total: result.total_cleaned
        });
      } else {
        console.error('Cleanup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Cleanup service error:', error);
      return {
        sessions_cleaned: 0,
        tokens_cleaned: 0,
        otps_cleaned: 0,
        password_resets_cleaned: 0,
        total_cleaned: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cleanup status
   */
  getStatus(): { 
    autoCleanupEnabled: boolean; 
    isRunning: boolean; 
    intervalMinutes?: number 
  } {
    return {
      autoCleanupEnabled: this.cleanupInterval !== null,
      isRunning: this.isRunning,
      intervalMinutes: this.cleanupInterval ? 60 : undefined // Default interval
    };
  }
}

// Export singleton instance
export const cleanupService = CleanupService.getInstance();

/**
 * Initialize cleanup service for browser/client-side
 * This should be called when the app starts
 */
export const initializeCleanup = (): void => {
  // Only run cleanup in development or if explicitly enabled
  const shouldRunCleanup = import.meta.env.DEV || 
                           import.meta.env.VITE_ENABLE_AUTO_CLEANUP === 'true';
  
  if (shouldRunCleanup) {
    // Start with 30 minute intervals in development
    cleanupService.startAutoCleanup(30);
    console.log('Cleanup service initialized');
  }
};

/**
 * Manual cleanup trigger for admin panels
 */
export const triggerManualCleanup = async (): Promise<CleanupResult> => {
  console.log('Manual cleanup triggered');
  return await cleanupService.runCleanup();
}; 