import { supabase } from './supabase';

export interface SharedSystemProfile {
  id: string;
  organization_id: string;
  system_name: string;
  system_type: 'college_lab' | 'library' | 'public_center' | 'shared_office' | 'other';
  location: string;
  expected_users: number;
  device_fingerprint_hash: string;
  ip_address: string;
  is_whitelisted: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedSystemActivity {
  id: string;
  shared_system_id: string;
  user_id: string;
  action_type: 'login' | 'vote' | 'registration';
  timestamp: string;
  session_duration?: number;
}

// Detect if a system is likely a shared system
export const detectSharedSystem = async (
  deviceFingerprint: any,
  ipAddress: string,
  organizationId: string
): Promise<{ isShared: boolean; confidence: number; reason: string }> => {
  try {
    // Check if this device fingerprint is already registered as a shared system
    const { data: existingSharedSystem } = await supabase
      .from('shared_systems')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('device_fingerprint_hash', deviceFingerprint.hash)
      .single();

    if (existingSharedSystem) {
      return {
        isShared: true,
        confidence: 100,
        reason: `Registered shared system: ${existingSharedSystem.system_name}`
      };
    }

    // Check for patterns that indicate shared system usage
    const patterns = await analyzeSharedSystemPatterns(deviceFingerprint.hash, ipAddress, organizationId);
    
    return {
      isShared: patterns.isShared,
      confidence: patterns.confidence,
      reason: patterns.reason
    };
  } catch (error) {
    console.error('Error detecting shared system:', error);
    return { isShared: false, confidence: 0, reason: 'Error in detection' };
  }
};

// Analyze patterns to determine if system is shared
const analyzeSharedSystemPatterns = async (
  deviceHash: string,
  ipAddress: string,
  organizationId: string
): Promise<{ isShared: boolean; confidence: number; reason: string }> => {
  let confidence = 0;
  const reasons: string[] = [];

  // 1. Check for multiple users from same device in short time
  const { data: recentUsers } = await supabase
    .from('user_sessions')
    .select('user_id, created_at')
    .eq('organization_id', organizationId)
    .eq('ip_address', ipAddress)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

  if (recentUsers) {
    const uniqueUsers = new Set(recentUsers.map(u => u.user_id));
    if (uniqueUsers.size > 3) {
      confidence += 40;
      reasons.push(`Multiple users (${uniqueUsers.size}) from same IP in 24 hours`);
    }
  }

  // 2. Check for consistent usage patterns (indicating lab/library)
  const { data: usagePatterns } = await supabase
    .from('user_sessions')
    .select('created_at')
    .eq('organization_id', organizationId)
    .eq('ip_address', ipAddress)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

  if (usagePatterns && usagePatterns.length > 10) {
    // Check if usage is during typical business/class hours
    const businessHourUsage = usagePatterns.filter(session => {
      const hour = new Date(session.created_at).getHours();
      return hour >= 8 && hour <= 18; // 8 AM to 6 PM
    });

    if (businessHourUsage.length > usagePatterns.length * 0.7) {
      confidence += 30;
      reasons.push('Consistent business hour usage pattern');
    }
  }

  // 3. Check for educational institution patterns
  const { data: org } = await supabase
    .from('organizations')
    .select('name, settings')
    .eq('id', organizationId)
    .single();

  if (org && isEducationalInstitution(org.name)) {
    confidence += 20;
    reasons.push('Educational institution detected');
  }

  // 4. Check for public IP ranges (libraries, public centers)
  if (isPublicIPRange(ipAddress)) {
    confidence += 25;
    reasons.push('Public IP range detected');
  }

  const isShared = confidence >= 50;
  return {
    isShared,
    confidence,
    reason: reasons.join('; ')
  };
};

// Check if organization is educational
const isEducationalInstitution = (orgName: string): boolean => {
  const educationalKeywords = [
    'college', 'university', 'school', 'institute', 'academy', 'campus',
    'education', 'learning', 'student', 'faculty', 'department'
  ];
  
  return educationalKeywords.some(keyword => 
    orgName.toLowerCase().includes(keyword)
  );
};

// Check if IP is in public range
const isPublicIPRange = (ipAddress: string): boolean => {
  // This is a simplified check - in production you'd use a proper IP geolocation service
  const publicRanges = [
    '192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
    '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'
  ];
  
  return publicRanges.some(range => ipAddress.startsWith(range));
};

// Register a shared system
export const registerSharedSystem = async (
  systemData: Omit<SharedSystemProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<SharedSystemProfile> => {
  try {
    const { data: sharedSystem, error } = await supabase
      .from('shared_systems')
      .insert({
        ...systemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return sharedSystem;
  } catch (error) {
    console.error('Error registering shared system:', error);
    throw error;
  }
};

// Track activity on shared system
export const trackSharedSystemActivity = async (
  sharedSystemId: string,
  userId: string,
  actionType: 'login' | 'vote' | 'registration',
  sessionDuration?: number
): Promise<void> => {
  try {
    await supabase
      .from('shared_system_activities')
      .insert({
        shared_system_id: sharedSystemId,
        user_id: userId,
        action_type: actionType,
        timestamp: new Date().toISOString(),
        session_duration: sessionDuration
      });
  } catch (error) {
    console.error('Error tracking shared system activity:', error);
  }
};

// Get shared system usage statistics
export const getSharedSystemStats = async (
  sharedSystemId: string
): Promise<{
  totalUsers: number;
  totalVotes: number;
  totalLogins: number;
  averageSessionDuration: number;
}> => {
  try {
    const { data: activities } = await supabase
      .from('shared_system_activities')
      .select('*')
      .eq('shared_system_id', sharedSystemId);

    if (!activities) {
      return { totalUsers: 0, totalVotes: 0, totalLogins: 0, averageSessionDuration: 0 };
    }

    const uniqueUsers = new Set(activities.map(a => a.user_id));
    const votes = activities.filter(a => a.action_type === 'vote').length;
    const logins = activities.filter(a => a.action_type === 'login').length;
    const sessionDurations = activities
      .filter(a => a.session_duration)
      .map(a => a.session_duration!);
    
    const avgSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;

    return {
      totalUsers: uniqueUsers.size,
      totalVotes: votes,
      totalLogins: logins,
      averageSessionDuration: avgSessionDuration
    };
  } catch (error) {
    console.error('Error getting shared system stats:', error);
    return { totalUsers: 0, totalVotes: 0, totalLogins: 0, averageSessionDuration: 0 };
  }
};

// Enhanced fraud detection for shared systems
export const validateSharedSystemActivity = async (
  userId: string,
  deviceFingerprint: any,
  ipAddress: string,
  organizationId: string,
  action: 'login' | 'vote' | 'registration'
): Promise<{ allowed: boolean; reason: string; sharedSystemId?: string }> => {
  try {
    // First, detect if this is a shared system
    const sharedSystemDetection = await detectSharedSystem(deviceFingerprint, ipAddress, organizationId);
    
    if (sharedSystemDetection.isShared) {
      // Check if this user has already used this shared system
      const { data: existingActivity } = await supabase
        .from('shared_system_activities')
        .select('shared_system_id')
        .eq('user_id', userId)
        .eq('action_type', action)
        .single();

      if (existingActivity) {
        return {
          allowed: false,
          reason: `User has already performed this action on this shared system`
        };
      }

      // Get or create shared system record
      let sharedSystemId = existingActivity?.shared_system_id;
      if (!sharedSystemId) {
        const { data: sharedSystem } = await supabase
          .from('shared_systems')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('device_fingerprint_hash', deviceFingerprint.hash)
          .single();

        if (sharedSystem) {
          sharedSystemId = sharedSystem.id;
        } else {
          // Create new shared system record
          const newSharedSystem = await registerSharedSystem({
            organization_id: organizationId,
            system_name: `Shared System - ${ipAddress}`,
            system_type: 'other',
            location: 'Unknown',
            expected_users: 10,
            device_fingerprint_hash: deviceFingerprint.hash,
            ip_address: ipAddress,
            is_whitelisted: true
          });
          sharedSystemId = newSharedSystem.id;
        }
      }

      // Track this activity
      await trackSharedSystemActivity(sharedSystemId, userId, action);

      return {
        allowed: true,
        reason: `Legitimate shared system usage detected`,
        sharedSystemId
      };
    }

    // Not a shared system - apply normal fraud detection
    return {
      allowed: true,
      reason: `Standard system usage`
    };
  } catch (error) {
    console.error('Error validating shared system activity:', error);
    return {
      allowed: false,
      reason: `Error in validation: ${error}`
    };
  }
}; 