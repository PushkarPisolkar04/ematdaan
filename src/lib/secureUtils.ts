
export const generateSecureOTP = (): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = (array[0] % 900000) + 100000;
  return otp.toString();
};

export const isValidOTPFormat = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const preparePasswordHash = async (password: string, salt?: string): Promise<string> => {
  const encoder = new TextEncoder();
  const saltValue = salt || crypto.randomUUID();
  const data = encoder.encode(password + saltValue);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, 1000);
};

export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && 
         email.length <= 254 && 
         email.length >= 5 &&
         !email.includes('..') &&
         !email.startsWith('.') &&
         !email.endsWith('.');
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
};

export const clearSensitiveData = (obj: any): void => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('otp')) {
        obj[key] = null;
      }
    });
  }
}; 