import { supabase } from './supabase';

export interface EmailValidationResult {
  isValid: boolean;
  isTemporary: boolean;
  isBlacklisted: boolean;
  isDisposable: boolean;
  riskScore: number;
  reason: string;
  suggestions: string[];
}

export interface EmailPatternAnalysis {
  domainPattern: string;
  usernamePattern: string;
  similarityScore: number;
  relatedEmails: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Comprehensive email validation
export const validateEmailComprehensive = async (
  email: string,
  organizationId: string
): Promise<EmailValidationResult> => {
  const result: EmailValidationResult = {
    isValid: true,
    isTemporary: false,
    isBlacklisted: false,
    isDisposable: false,
    riskScore: 0,
    reason: '',
    suggestions: []
  };

  try {
    // 1. Basic email format validation
    if (!isValidEmailFormat(email)) {
      result.isValid = false;
      result.reason = 'Invalid email format';
      result.suggestions.push('Please enter a valid email address');
      return result;
    }

    // 2. Check for temporary email providers
    const tempEmailCheck = await checkTemporaryEmail(email);
    if (tempEmailCheck.isTemporary) {
      result.isTemporary = true;
      result.isValid = false;
      result.riskScore += 50;
      result.reason = `Temporary email provider detected: ${tempEmailCheck.provider}`;
      result.suggestions.push('Please use a permanent email address');
      return result;
    }

    // 3. Check for disposable email providers
    const disposableCheck = await checkDisposableEmail(email);
    if (disposableCheck.isDisposable) {
      result.isDisposable = true;
      result.riskScore += 30;
      result.reason = `Disposable email provider detected: ${disposableCheck.provider}`;
      result.suggestions.push('Please use a permanent email address');
    }

    // 4. Check organization blacklist
    const blacklistCheck = await checkOrganizationBlacklist(email, organizationId);
    if (blacklistCheck.isBlacklisted) {
      result.isBlacklisted = true;
      result.isValid = false;
      result.riskScore += 40;
      result.reason = `Email domain is blacklisted: ${blacklistCheck.reason}`;
      result.suggestions.push('Please use a different email address');
      return result;
    }

    // 5. Check for suspicious patterns
    const patternAnalysis = await analyzeEmailPatterns(email, organizationId);
    if (patternAnalysis.riskLevel === 'critical') {
      result.isValid = false;
      result.riskScore += 60;
      result.reason = 'Suspicious email pattern detected';
      result.suggestions.push('Please use a different email address');
      return result;
    } else if (patternAnalysis.riskLevel === 'high') {
      result.riskScore += 40;
      result.reason = 'High-risk email pattern detected';
      result.suggestions.push('Please verify this is your personal email');
    } else if (patternAnalysis.riskLevel === 'medium') {
      result.riskScore += 20;
      result.reason = 'Medium-risk email pattern detected';
    }

    // 6. Check for rapid email creation
    const rapidCreationCheck = await checkRapidEmailCreation(email, organizationId);
    if (rapidCreationCheck.isRapid) {
      result.riskScore += 35;
      result.reason = 'Rapid email creation detected';
      result.suggestions.push('Please wait before creating another account');
    }

    // 7. Check for email domain reputation
    const reputationCheck = await checkEmailDomainReputation(email);
    if (reputationCheck.lowReputation) {
      result.riskScore += 25;
      result.reason = 'Low reputation email domain';
      result.suggestions.push('Please use a well-known email provider');
    }

    return result;
  } catch (error) {
    console.error('Email validation error:', error);
    result.isValid = false;
    result.reason = 'Error during email validation';
    return result;
  }
};

// Check if email format is valid
const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Check for temporary email providers
const checkTemporaryEmail = async (email: string): Promise<{ isTemporary: boolean; provider?: string }> => {
  try {
    const domain = email.split('@')[1].toLowerCase();
    
    const { data: tempProvider } = await supabase
      .from('temporary_email_providers')
      .select('provider_name')
      .eq('domain', domain)
      .eq('is_active', true)
      .single();

    return {
      isTemporary: !!tempProvider,
      provider: tempProvider?.provider_name
    };
  } catch (error) {
    return { isTemporary: false };
  }
};

// Check for disposable email providers (additional to temporary)
const checkDisposableEmail = async (email: string): Promise<{ isDisposable: boolean; provider?: string }> => {
  const disposableDomains = [
    'tempmail.org', 'throwaway.email', 'maildrop.cc', 'guerrillamailblock.com',
    'sharklasers.com', 'grr.la', 'pokemail.net', 'spam4.me', 'bccto.me',
    'chacuo.net', 'dispostable.com', 'fakeinbox.com', 'mailnesia.com',
    'mintemail.com', 'mytrashmail.com', 'nwldx.com', 'spamspot.com',
    'trashmail.net', 'wegwerfemail.de', 'wemel.org', 'yopmail.net', 'zoemail.net'
  ];

  const domain = email.split('@')[1].toLowerCase();
  const isDisposable = disposableDomains.includes(domain);

  return {
    isDisposable,
    provider: isDisposable ? domain : undefined
  };
};

// Check organization blacklist
const checkOrganizationBlacklist = async (
  email: string,
  organizationId: string
): Promise<{ isBlacklisted: boolean; reason?: string }> => {
  try {
    const domain = email.split('@')[1].toLowerCase();
    
    const { data: blacklistedDomain } = await supabase
      .from('email_domain_blacklist')
      .select('reason')
      .eq('organization_id', organizationId)
      .eq('domain', domain)
      .single();

    return {
      isBlacklisted: !!blacklistedDomain,
      reason: blacklistedDomain?.reason
    };
  } catch (error) {
    return { isBlacklisted: false };
  }
};

// Analyze email patterns for suspicious activity
const analyzeEmailPatterns = async (
  email: string,
  organizationId: string
): Promise<EmailPatternAnalysis> => {
  const [username, domain] = email.split('@');
  let riskScore = 0;
  const relatedEmails: string[] = [];

  try {
    // 1. Check for sequential patterns (user1, user2, user3)
    if (/\d+$/.test(username)) {
      const baseUsername = username.replace(/\d+$/, '');
      const { data: sequentialEmails } = await supabase
        .from('auth_users')
        .select('email')
        .eq('organization_id', organizationId)
        .ilike('email', `${baseUsername}%@${domain}`);

      if (sequentialEmails && sequentialEmails.length > 2) {
        riskScore += 40;
        relatedEmails.push(...sequentialEmails.map(e => e.email));
      }
    }

    // 2. Check for similar usernames
    const { data: similarEmails } = await supabase
      .from('auth_users')
      .select('email')
      .eq('organization_id', organizationId)
      .ilike('email', `%${domain}`);

    if (similarEmails) {
      const similarUsernames = similarEmails
        .map(e => e.email.split('@')[0])
        .filter(u => calculateSimilarity(username, u) > 0.7);

      if (similarUsernames.length > 3) {
        riskScore += 30;
        relatedEmails.push(...similarEmails.map(e => e.email));
      }
    }

    // 3. Check for common patterns
    const suspiciousPatterns = [
      /^test\d*$/i,
      /^admin\d*$/i,
      /^user\d*$/i,
      /^demo\d*$/i,
      /^temp\d*$/i,
      /^fake\d*$/i,
      /^spam\d*$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(username))) {
      riskScore += 25;
    }

    // 4. Check for very short usernames
    if (username.length < 3) {
      riskScore += 15;
    }

    // 5. Check for random-looking usernames
    if (/^[a-z]{1,2}\d{3,}$/i.test(username)) {
      riskScore += 20;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';

    return {
      domainPattern: domain,
      usernamePattern: username,
      similarityScore: riskScore,
      relatedEmails,
      riskLevel
    };
  } catch (error) {
    console.error('Email pattern analysis error:', error);
    return {
      domainPattern: domain,
      usernamePattern: username,
      similarityScore: 0,
      relatedEmails: [],
      riskLevel: 'low'
    };
  }
};

// Calculate similarity between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// Levenshtein distance calculation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Check for rapid email creation
const checkRapidEmailCreation = async (
  email: string,
  organizationId: string
): Promise<{ isRapid: boolean; count: number }> => {
  try {
    const domain = email.split('@')[1];
    
    const { data: recentEmails } = await supabase
      .from('auth_users')
      .select('created_at')
      .eq('organization_id', organizationId)
      .ilike('email', `%@${domain}`)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    const count = recentEmails?.length || 0;
    return {
      isRapid: count > 3,
      count
    };
  } catch (error) {
    return { isRapid: false, count: 0 };
  }
};

// Check email domain reputation
const checkEmailDomainReputation = async (email: string): Promise<{ lowReputation: boolean; reason?: string }> => {
  const lowReputationDomains = [
    'mailinator.com', 'guerrillamail.com', '10minutemail.com',
    'tempmail.org', 'throwaway.email', 'maildrop.cc'
  ];

  const domain = email.split('@')[1].toLowerCase();
  const isLowReputation = lowReputationDomains.includes(domain);

  return {
    lowReputation: isLowReputation,
    reason: isLowReputation ? 'Known low-reputation email provider' : undefined
  };
};

// Enhanced email registration validation
export const validateEmailRegistration = async (
  email: string,
  organizationId: string,
  userId?: string
): Promise<{ allowed: boolean; reason: string; riskScore: number }> => {
  try {
    // Comprehensive email validation
    const validation = await validateEmailComprehensive(email, organizationId);
    
    if (!validation.isValid) {
      return {
        allowed: false,
        reason: validation.reason,
        riskScore: validation.riskScore
      };
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser && existingUser.id !== userId) {
      return {
        allowed: false,
        reason: 'Email address is already registered',
        riskScore: 100
      };
    }

    // Check for multiple accounts from same domain
    const domain = email.split('@')[1];
    const { data: domainUsers } = await supabase
      .from('auth_users')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('email', `%@${domain}`);

    if (domainUsers && domainUsers.length > 5) {
      return {
        allowed: false,
        reason: `Too many accounts from email domain: ${domain}`,
        riskScore: 80
      };
    }

    // Determine if registration should be allowed based on risk score
    const allowed = validation.riskScore < 70;
    
    return {
      allowed,
      reason: allowed ? 'Email validation passed' : `High risk email: ${validation.reason}`,
      riskScore: validation.riskScore
    };
  } catch (error) {
    console.error('Email registration validation error:', error);
    return {
      allowed: false,
      reason: 'Error during email validation',
      riskScore: 100
    };
  }
};

// Get email domain statistics
export const getEmailDomainStats = async (organizationId: string) => {
  try {
    const { data: users } = await supabase
      .from('auth_users')
      .select('email, created_at')
      .eq('organization_id', organizationId);

    if (!users) return {};

    const domainStats: Record<string, { count: number; recent: number; domains: string[] }> = {};
    
    users.forEach(user => {
      const domain = user.email.split('@')[1];
      if (!domainStats[domain]) {
        domainStats[domain] = { count: 0, recent: 0, domains: [] };
      }
      
      domainStats[domain].count++;
      domainStats[domain].domains.push(domain);
      
      // Check if created in last 24 hours
      const createdDate = new Date(user.created_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (createdDate > oneDayAgo) {
        domainStats[domain].recent++;
      }
    });

    return domainStats;
  } catch (error) {
    console.error('Error getting email domain stats:', error);
    return {};
  }
}; 