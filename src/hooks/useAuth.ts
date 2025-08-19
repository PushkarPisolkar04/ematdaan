import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { sendOTP, verifyOTP } from '@/lib/otp';
import { supabase } from '@/lib/supabase';

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  organizationId: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    name: null,
    role: null,
    organizationId: null,
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const sessionToken = localStorage.getItem('session_token');
        const userId = localStorage.getItem('user_id');
        const email = localStorage.getItem('user_email');
        const name = localStorage.getItem('user_name');
        const role = localStorage.getItem('user_role');
        const organizationId = localStorage.getItem('organization_id');
        
        if (sessionToken && userId && email) {
          // Verify session is still valid
          const { data: session, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('token', sessionToken)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

          if (session && !error) {
            setAuthState({
              isAuthenticated: true,
              userId,
              email,
              name,
              role,
              organizationId,
            });
            return;
          }
        }

        // Invalid or expired session, clear auth state
        setAuthState({
          isAuthenticated: false,
          userId: null,
          email: null,
          name: null,
          role: null,
          organizationId: null,
        });
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_role');
        localStorage.removeItem('organization_id');
        
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          navigate('/');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    initializeAuth();
  }, [navigate]);

  // Register new user
  const register = useCallback(async (email: string, name: string, dob: string) => {
    try {
      // Send OTP for verification
      const otpResponse = await sendOTP(email);
      if (!otpResponse.success) {
        throw new Error(otpResponse.message);
      }

      // Store registration data temporarily
      sessionStorage.setItem('registration', JSON.stringify({
        email,
        name,
        dob,
      }));

      return otpResponse;
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Complete registration with OTP
  const verifyRegistration = useCallback(async (otp: string) => {
    try {
      const registration = sessionStorage.getItem('registration');
      if (!registration) {
        throw new Error('Registration data not found');
      }

      const { email, name, dob } = JSON.parse(registration);

      // Verify OTP
      const otpResponse = await verifyOTP(email, otp);
      if (!otpResponse.success) {
        throw new Error(otpResponse.message);
      }

      // Create user account
      const { data: user, error: userError } = await supabase
        .from('auth_users')
        .insert({
          email,
          name,
          date_of_birth: dob,
          is_verified: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Update auth state
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: 'voter',
        organizationId: null,
      }));

      // Clear temporary storage
      sessionStorage.removeItem('registration');

      // Navigate to dashboard
      navigate('/dashboard');

      return true;
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  }, [navigate, toast]);

  // Login existing user
  const login = useCallback(async (email: string) => {
    try {
      // Send OTP
      const otpResponse = await sendOTP(email);
      if (!otpResponse.success) {
        throw new Error(otpResponse.message);
      }

      // Store email temporarily
      sessionStorage.setItem('login_email', email);

      return otpResponse;
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Complete login with OTP
  const verifyLogin = useCallback(async (otp: string) => {
    try {
      const email = sessionStorage.getItem('login_email');
      if (!email) {
        throw new Error('Login data not found');
      }

      // Verify OTP
      const otpResponse = await verifyOTP(email, otp);
      if (!otpResponse.success) {
        throw new Error(otpResponse.message);
      }

      // Get user data
      const { data: user, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) throw userError;

      // Create session
      const sessionToken = crypto.randomUUID();
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          token: sessionToken,
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });

      if (sessionError) throw sessionError;

      // Get user organization role
      const { data: userOrg, error: orgError } = await supabase
        .from('user_organizations')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      const role = userOrg?.role || 'voter';
      const organizationId = userOrg?.organization_id || null;

      // Update auth state
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        userId: user.id,
        email: user.email,
        name: user.name,
        role,
        organizationId,
      }));

      // Store in localStorage
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user_email', user.email);
      localStorage.setItem('user_name', user.name);
      localStorage.setItem('user_role', role);
      if (organizationId) {
        localStorage.setItem('organization_id', organizationId);
      }

      // Clear temporary storage
      sessionStorage.removeItem('login_email');

      // Navigate to dashboard
      navigate('/dashboard');

      return true;
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  }, [navigate, toast]);

  // Logout
  const logout = useCallback(async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        // Deactivate session
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('token', sessionToken);
      }

      setAuthState({
        isAuthenticated: false,
        userId: null,
        email: null,
        name: null,
        role: null,
        organizationId: null,
      });

      // Clear localStorage
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_role');
      localStorage.removeItem('organization_id');

      navigate('/');
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Failed to logout properly',
        variant: 'destructive',
      });
    }
  }, [navigate, toast]);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const userId = localStorage.getItem('user_id');
      
      if (!sessionToken || !userId) {
        return false;
      }

      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('token', sessionToken)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const handleLogin = async (userData: AuthUser) => {
    try {
      const { data: user, error } = await supabase
        .from('auth_users')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  return {
    authState,
    register,
    verifyRegistration,
    login,
    verifyLogin,
    logout,
    checkAuth,
    handleLogin,
  };
}; 