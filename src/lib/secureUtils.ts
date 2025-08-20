// Secure utilities for the voting system
// This file contains security-focused functions with no data leaks

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export const generateSecureOTP = (): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Ensure we get a 6-digit number
  const otp = (array[0] % 900000) + 100000;
  return otp.toString();
};

/**
 * Validate OTP format without logging sensitive data
 */
export const isValidOTPFormat = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

/**
 * Generate a cryptographically secure token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Secure password hashing (client-side preparation)
 */
export const preparePasswordHash = async (password: string, salt?: string): Promise<string> => {
  const encoder = new TextEncoder();
  const saltValue = salt || crypto.randomUUID();
  const data = encoder.encode(password + saltValue);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length
};

/**
 * Validate email format securely
 */
export const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && 
         email.length <= 254 && 
         email.length >= 5 &&
         !email.includes('..') && // No consecutive dots
         !email.startsWith('.') && // No starting dot
         !email.endsWith('.'); // No ending dot
};

/**
 * Rate limiting check (client-side)
 */
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

/**
 * Clear sensitive data from memory (best effort)
 */
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