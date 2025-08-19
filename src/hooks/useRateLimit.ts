import { useState, useEffect } from 'react';
import { checkRateLimit } from '@/lib/advancedSecurity';
import { useToast } from '@/hooks/use-toast';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  action: string;
}

interface RateLimitState {
  isRateLimited: boolean;
  remainingAttempts: number;
  resetTime: Date | null;
  checkRateLimit: () => Promise<boolean>;
}

export const useRateLimit = (
  userId: string | null,
  config: RateLimitConfig
): RateLimitState => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(config.maxAttempts);
  const [resetTime, setResetTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const checkLimit = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const allowed = await checkRateLimit(
        userId,
        config.action,
        config.maxAttempts,
        config.windowMinutes
      );

      if (!allowed) {
        setIsRateLimited(true);
        setRemainingAttempts(0);
        
        // Set reset time
        const resetDate = new Date();
        resetDate.setMinutes(resetDate.getMinutes() + config.windowMinutes);
        setResetTime(resetDate);

        toast({
          title: "Rate Limit Exceeded",
          description: `Too many attempts. Please wait ${config.windowMinutes} minutes before trying again.`,
          variant: "destructive"
        });

        return false;
      }

      // Update remaining attempts (this is approximate)
      setRemainingAttempts(prev => Math.max(0, prev - 1));
      return true;

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Allow action if rate limit check fails (fail open)
      return true;
    }
  };

  // Reset rate limit state when window expires
  useEffect(() => {
    if (!resetTime) return;

    const checkReset = () => {
      const now = new Date();
      if (now >= resetTime) {
        setIsRateLimited(false);
        setRemainingAttempts(config.maxAttempts);
        setResetTime(null);
      }
    };

    const interval = setInterval(checkReset, 1000);
    return () => clearInterval(interval);
  }, [resetTime, config.maxAttempts]);

  return {
    isRateLimited,
    remainingAttempts,
    resetTime,
    checkRateLimit: checkLimit
  };
};

// Pre-configured rate limit hooks for common actions
export const useLoginRateLimit = (userId: string | null) => 
  useRateLimit(userId, {
    maxAttempts: 5,
    windowMinutes: 15,
    action: 'login_attempt'
  });

export const useVoteRateLimit = (userId: string | null) => 
  useRateLimit(userId, {
    maxAttempts: 3,
    windowMinutes: 60,
    action: 'vote_attempt'
  });

export const useMFARateLimit = (userId: string | null) => 
  useRateLimit(userId, {
    maxAttempts: 10,
    windowMinutes: 60,
    action: 'mfa_request'
  });

export const usePasswordResetRateLimit = (userId: string | null) => 
  useRateLimit(userId, {
    maxAttempts: 3,
    windowMinutes: 60,
    action: 'password_reset'
  }); 