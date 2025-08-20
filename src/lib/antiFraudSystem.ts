import { supabase } from './supabase';
import { logSecurityEvent } from './securityAudit';

// Device fingerprinting interface
export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  fonts: string[];
  plugins: string[];
  hash: string;
}

// Behavioral analysis interface
export interface UserBehavior {
  typingSpeed: number[];
  mouseMovements: number[];
  clickPatterns: number[];
  scrollPatterns: number[];
  sessionDuration: number;
  pageNavigationPattern: string[];
  timeOfDay: string;
  deviceUsagePattern: string;
}

// Fraud detection interface
export interface FraudDetectionResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendations: string[];
  blocked: boolean;
}

// Generate comprehensive device fingerprint
export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Generate canvas fingerprint
  ctx!.fillText('Device fingerprinting test', 10, 10);
  const canvasFingerprint = canvas.toDataURL();
  
  // Generate WebGL fingerprint
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  let webglFingerprint = '';
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      webglFingerprint = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
  }
  
  // Generate audio fingerprint
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const analyser = audioContext.createAnalyser();
  oscillator.connect(analyser);
  oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
  oscillator.start();
  oscillator.stop();
  const audioFingerprint = audioContext.sampleRate.toString();
  
  // Get available fonts
  const fontList = [
    'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Console'
  ];
  
  const availableFonts = fontList.filter(font => {
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = testSize + ' ' + font;
    const baseline = context.measureText(testString).width;
    context.font = testSize + ' monospace';
    const baseline2 = context.measureText(testString).width;
    return baseline !== baseline2;
  });
  
  // Get plugins
  const plugins = Array.from(navigator.plugins).map(p => p.name);
  
  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    canvasFingerprint,
    webglFingerprint,
    audioFingerprint,
    fonts: availableFonts,
    plugins
  };
  
  // Generate hash of fingerprint
  const fingerprintString = JSON.stringify(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  fingerprint.hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return fingerprint;
};

// Track user behavior
export const trackUserBehavior = (): UserBehavior => {
  const behavior: UserBehavior = {
    typingSpeed: [],
    mouseMovements: [],
    clickPatterns: [],
    scrollPatterns: [],
    sessionDuration: 0,
    pageNavigationPattern: [],
    timeOfDay: new Date().toLocaleTimeString(),
    deviceUsagePattern: 'desktop' // or mobile based on screen size
  };
  
  // Track typing speed
  let lastKeyTime = Date.now();
  document.addEventListener('keydown', () => {
    const currentTime = Date.now();
    behavior.typingSpeed.push(currentTime - lastKeyTime);
    lastKeyTime = currentTime;
  });
  
  // Track mouse movements
  let lastMouseTime = Date.now();
  document.addEventListener('mousemove', () => {
    const currentTime = Date.now();
    behavior.mouseMovements.push(currentTime - lastMouseTime);
    lastMouseTime = currentTime;
  });
  
  // Track clicks
  document.addEventListener('click', () => {
    behavior.clickPatterns.push(Date.now());
  });
  
  // Track scroll
  document.addEventListener('scroll', () => {
    behavior.scrollPatterns.push(Date.now());
  });
  
  return behavior;
};

// Check for duplicate devices
export const checkDuplicateDevices = async (
  deviceFingerprint: DeviceFingerprint,
  organizationId: string
): Promise<{ duplicate: boolean; accounts: string[] }> => {
  try {
    const { data: existingDevices } = await supabase
      .from('device_fingerprints')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .eq('fingerprint_hash', deviceFingerprint.hash);
    
    if (existingDevices && existingDevices.length > 0) {
      return {
        duplicate: true,
        accounts: existingDevices.map(d => d.user_id)
      };
    }
    
    return { duplicate: false, accounts: [] };
  } catch (error) {
    console.error('Error checking duplicate devices:', error);
    return { duplicate: false, accounts: [] };
  }
};

// Check for suspicious IP patterns
export const checkSuspiciousIP = async (
  ipAddress: string,
  organizationId: string
): Promise<{ suspicious: boolean; reason: string }> => {
  try {
    // Check for multiple accounts from same IP
    const { data: ipAccounts } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('ip_address', ipAddress);
    
    if (ipAccounts && ipAccounts.length > 3) {
      return {
        suspicious: true,
        reason: `Multiple accounts (${ipAccounts.length}) from same IP address`
      };
    }
    
    // Check for rapid account creation from same IP
    const { data: recentAccounts } = await supabase
      .from('auth_users')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
    
    if (recentAccounts && recentAccounts.length > 5) {
      return {
        suspicious: true,
        reason: 'Rapid account creation from same IP'
      };
    }
    
    return { suspicious: false, reason: '' };
  } catch (error) {
    console.error('Error checking suspicious IP:', error);
    return { suspicious: false, reason: '' };
  }
};

// Comprehensive fraud detection
export const detectFraud = async (
  userId: string,
  organizationId: string,
  deviceFingerprint: DeviceFingerprint,
  userBehavior: UserBehavior,
  action: 'registration' | 'login' | 'voting'
): Promise<FraudDetectionResult> => {
  let riskScore = 0;
  const flags: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // 1. Check for duplicate devices
    const duplicateCheck = await checkDuplicateDevices(deviceFingerprint, organizationId);
    if (duplicateCheck.duplicate) {
      riskScore += 40;
      flags.push('duplicate_device');
      recommendations.push('Device fingerprint matches existing account');
    }
    
    // 2. Check for suspicious behavior patterns
    if (userBehavior.typingSpeed.length > 0) {
      const avgTypingSpeed = userBehavior.typingSpeed.reduce((a, b) => a + b, 0) / userBehavior.typingSpeed.length;
      if (avgTypingSpeed < 50) { // Too fast typing
        riskScore += 20;
        flags.push('suspicious_typing_speed');
      }
    }
    
    // 3. Check for rapid actions
    if (action === 'registration') {
      const { data: recentRegistrations } = await supabase
        .from('auth_users')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour
      
      if (recentRegistrations && recentRegistrations.length > 2) {
        riskScore += 30;
        flags.push('rapid_registration');
        recommendations.push('Multiple registrations in short time');
      }
    }
    
    // 4. Check for voting patterns
    if (action === 'voting') {
      const { data: recentVotes } = await supabase
        .from('votes')
        .select('created_at')
        .eq('voter_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
      
      if (recentVotes && recentVotes.length > 1) {
        riskScore += 50;
        flags.push('multiple_votes');
        recommendations.push('Multiple votes detected');
      }
    }
    
    // 5. Check for email domain patterns
    const { data: user } = await supabase
      .from('auth_users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (user) {
      const emailDomain = user.email.split('@')[1];
      const { data: sameDomainUsers } = await supabase
        .from('auth_users')
        .select('id')
        .eq('organization_id', organizationId)
        .ilike('email', `%@${emailDomain}`);
      
      if (sameDomainUsers && sameDomainUsers.length > 5) {
        riskScore += 25;
        flags.push('multiple_same_domain');
        recommendations.push('Multiple accounts from same email domain');
      }
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    
    const blocked = riskLevel === 'critical';
    
    // Log fraud detection event
    await logSecurityEvent(
      'fraud_detection',
      {
        riskScore,
        riskLevel,
        flags,
        action,
        deviceFingerprint: deviceFingerprint.hash
      },
      userId,
      organizationId,
      !blocked,
      blocked ? 'Account blocked due to high fraud risk' : null
    );
    
    return {
      riskScore,
      riskLevel,
      flags,
      recommendations,
      blocked
    };
    
  } catch (error) {
    console.error('Fraud detection error:', error);
    return {
      riskScore: 0,
      riskLevel: 'low',
      flags: [],
      recommendations: [],
      blocked: false
    };
  }
};

// Store device fingerprint
export const storeDeviceFingerprint = async (
  userId: string,
  organizationId: string,
  deviceFingerprint: DeviceFingerprint
): Promise<void> => {
  try {
    await supabase
      .from('device_fingerprints')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        fingerprint_hash: deviceFingerprint.hash,
        fingerprint_data: deviceFingerprint,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error storing device fingerprint:', error);
  }
};

// Real-time monitoring for suspicious patterns
export const monitorSuspiciousActivity = async (
  organizationId: string
): Promise<{ suspicious: boolean; alerts: string[] }> => {
  const alerts: string[] = [];
  
  try {
    // Check for rapid vote casting
    const { data: recentVotes } = await supabase
      .from('votes')
      .select('created_at, voter_id')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes
    
    if (recentVotes && recentVotes.length > 10) {
      alerts.push(`High vote volume detected: ${recentVotes.length} votes in 5 minutes`);
    }
    
    // Check for multiple accounts from same IP
    const { data: ipGroups } = await supabase
      .from('user_sessions')
      .select('ip_address, user_id')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour
    
    if (ipGroups) {
      const ipCounts = ipGroups.reduce((acc, session) => {
        acc[session.ip_address!] = (acc[session.ip_address!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(ipCounts).forEach(([ip, count]) => {
        if (count > 3) {
          alerts.push(`Multiple accounts (${count}) from IP: ${ip}`);
        }
      });
    }
    
    return {
      suspicious: alerts.length > 0,
      alerts
    };
    
  } catch (error) {
    console.error('Error monitoring suspicious activity:', error);
    return { suspicious: false, alerts: [] };
  }
};

// Enhanced vote validation with fraud detection
export const validateVoteWithFraudDetection = async (
  userId: string,
  electionId: string,
  organizationId: string
): Promise<{ valid: boolean; fraudDetected: boolean; reason?: string }> => {
  try {
    // Generate device fingerprint
    const deviceFingerprint = await generateDeviceFingerprint();
    
    // Track user behavior
    const userBehavior = trackUserBehavior();
    
    // Run fraud detection
    const fraudResult = await detectFraud(userId, organizationId, deviceFingerprint, userBehavior, 'voting');
    
    if (fraudResult.blocked) {
      return {
        valid: false,
        fraudDetected: true,
        reason: `Vote blocked due to fraud detection. Risk level: ${fraudResult.riskLevel}`
      };
    }
    
    // Store device fingerprint
    await storeDeviceFingerprint(userId, organizationId, deviceFingerprint);
    
    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_id', userId)
      .eq('election_id', electionId)
      .single();
    
    if (existingVote) {
      return {
        valid: false,
        fraudDetected: true,
        reason: 'User has already voted in this election'
      };
    }
    
    return {
      valid: true,
      fraudDetected: false
    };
    
  } catch (error) {
    console.error('Vote validation error:', error);
    return {
      valid: false,
      fraudDetected: true,
      reason: 'Error during vote validation'
    };
  }
}; 