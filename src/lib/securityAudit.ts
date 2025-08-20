import { supabase } from './supabase';

export interface SecurityAuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action_type: string;
  action_details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  error_message: string | null;
  timestamp: string;
  created_at: string;
}

export type SecurityActionType = 
  | 'login_attempt'
  | 'login_success' 
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'mfa_request'
  | 'mfa_success'
  | 'mfa_failure'
  | 'vote_cast'
  | 'vote_change'
  | 'vote_verification'
  | 'fraud_vote_attempt'
  | 'fraud_detection'
  | 'admin_action'
  | 'data_export'
  | 'security_breach_attempt'
  | 'rate_limit_exceeded'
  | 'suspicious_activity';

// Get client information for audit logging
const getClientInfo = () => {
  return {
    ip_address: null, // In production, this would be obtained from server
    user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
    timestamp: new Date().toISOString()
  };
};

// Log security event
export const logSecurityEvent = async (
  actionType: SecurityActionType,
  actionDetails: Record<string, any>,
  userId: string | null = null,
  organizationId: string | null = null,
  success: boolean = true,
  errorMessage: string | null = null
): Promise<void> => {
  try {
    const clientInfo = getClientInfo();
    
    const auditLog = {
      organization_id: organizationId,
      user_id: userId,
      action_type: actionType,
      action_details: actionDetails,
      ip_address: clientInfo.ip_address,
      user_agent: clientInfo.user_agent,
      success,
      error_message: errorMessage,
      timestamp: clientInfo.timestamp
    };

    const { error } = await supabase
      .from('security_audit_logs')
      .insert(auditLog);

    if (error) {
      console.error('Failed to log security event:', error);
      // Don't throw error - audit logging shouldn't break main functionality
    }

  } catch (error) {
    console.error('Security audit logging failed:', error);
    // Silent failure - audit logging is supplementary
  }
};

// Convenience functions for common security events

export const logLoginAttempt = async (
  email: string,
  success: boolean,
  userId: string | null = null,
  errorMessage: string | null = null
) => {
  await logSecurityEvent(
    success ? 'login_success' : 'login_failure',
    { email, login_method: 'email_password' },
    userId,
    null,
    success,
    errorMessage
  );
};

export const logMFAAttempt = async (
  userId: string,
  action: string,
  success: boolean,
  errorMessage: string | null = null
) => {
  await logSecurityEvent(
    success ? 'mfa_success' : 'mfa_failure',
    { action, mfa_method: 'email_otp' },
    userId,
    null,
    success,
    errorMessage
  );
};

export const logVoteCast = async (
  userId: string,
  electionId: string,
  organizationId: string | null = null,
  additionalDetails: Record<string, any> = {}
) => {
  await logSecurityEvent(
    'vote_cast',
    {
      election_id: electionId,
      encryption_method: 'AES-256-GCM',
      signature_method: 'ECDSA',
      blockchain_submitted: true,
      zk_proof_generated: true,
      anti_coercion_enabled: true,
      ...additionalDetails
    },
    userId,
    organizationId,
    true
  );
};

export const logVoteChange = async (
  userId: string,
  electionId: string,
  changeCount: number,
  organizationId: string | null = null
) => {
  await logSecurityEvent(
    'vote_change',
    {
      election_id: electionId,
      change_count: changeCount,
      anti_coercion_feature: true
    },
    userId,
    organizationId,
    true
  );
};

export const logPasswordChange = async (
  userId: string,
  success: boolean,
  errorMessage: string | null = null
) => {
  await logSecurityEvent(
    'password_change',
    { security_level: 'high' },
    userId,
    null,
    success,
    errorMessage
  );
};

export const logRateLimitExceeded = async (
  userId: string | null,
  action: string,
  attemptCount: number
) => {
  await logSecurityEvent(
    'rate_limit_exceeded',
    {
      action,
      attempt_count: attemptCount,
      protection_triggered: true
    },
    userId,
    null,
    false,
    `Rate limit exceeded for action: ${action}`
  );
};

export const logSuspiciousActivity = async (
  userId: string | null,
  activityType: string,
  details: Record<string, any>
) => {
  await logSecurityEvent(
    'suspicious_activity',
    {
      activity_type: activityType,
      ...details
    },
    userId,
    null,
    false,
    `Suspicious activity detected: ${activityType}`
  );
};

export const logAdminAction = async (
  adminUserId: string,
  action: string,
  targetId: string | null = null,
  organizationId: string | null = null
) => {
  await logSecurityEvent(
    'admin_action',
    {
      admin_action: action,
      target_id: targetId,
      requires_audit: true
    },
    adminUserId,
    organizationId,
    true
  );
};

// Get security audit logs with filtering
export const getSecurityAuditLogs = async (
  filters: {
    userId?: string;
    organizationId?: string;
    actionType?: SecurityActionType;
    success?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<SecurityAuditLog[]> => {
  try {
    let query = supabase
      .from('security_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }
    
    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }
    
    if (filters.success !== undefined) {
      query = query.eq('success', filters.success);
    }
    
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    throw new Error('Failed to retrieve security audit logs');
  }
};

// Get security statistics
export const getSecurityStats = async (
  organizationId: string | null = null,
  timeRange: 'day' | 'week' | 'month' = 'week'
): Promise<{
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  topActions: Array<{ action_type: string; count: number }>;
  securityScore: number;
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

    let query = supabase
      .from('security_audit_logs')
      .select('action_type, success')
      .gte('timestamp', startDate.toISOString());

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const logs = data || [];
    const totalEvents = logs.length;
    const successfulEvents = logs.filter(log => log.success).length;
    const failedEvents = totalEvents - successfulEvents;

    // Count actions
    const actionCounts: Record<string, number> = {};
    logs.forEach(log => {
      actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action_type, count]) => ({ action_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate security score (simple heuristic)
    const securityScore = totalEvents > 0 
      ? Math.round((successfulEvents / totalEvents) * 100)
      : 100;

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      topActions,
      securityScore
    };

  } catch (error) {
    console.error('Failed to get security stats:', error);
    throw new Error('Failed to retrieve security statistics');
  }
}; 