import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { generateSecureOTP, isValidOTPFormat } from '@/lib/secureUtils';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_verified: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  admin_email: string;
}

interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  joined_via: string;
  is_active: boolean;
  organization: Organization;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  userRole: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createOrganization: (data: {
    name: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
  }) => Promise<void>;
  joinOrganization: (token: string, data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      
      // Check for session token in localStorage
      const sessionToken = localStorage.getItem('session_token');
      
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      // Validate session with database
      const { data, error } = await supabase.rpc('validate_session', {
        p_session_token: sessionToken
      });

      if (error || !data || data.length === 0 || !data[0].is_valid) {
        // Invalid session, clear storage
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('organization_data');
        setIsLoading(false);
        return;
      }

      const sessionData = data[0];
      
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('id', sessionData.user_id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', sessionData.organization_id)
        .single();

      if (orgError || !orgData) {
        throw new Error('Organization not found');
      }

      // Update state
      setUser(userData);
      setOrganization(orgData);
      setUserRole(sessionData.role);
      setIsAuthenticated(true);

      // Store in localStorage for persistence
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('organization_data', JSON.stringify(orgData));
      localStorage.setItem('user_role', sessionData.role);

    } catch (error) {
      console.error('Session check failed:', error);
      // Clear invalid session data
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('organization_data');
      localStorage.removeItem('user_role');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      // First, find the user
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please check your email or register.');
      }

      // Verify password (in a real app, you'd use bcrypt)
      // For now, we'll assume password verification is handled by the backend
      if (userData.password_hash !== password) { // This is simplified - should use bcrypt
        throw new Error('Invalid password');
      }

      // Get user's organization
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', userData.id)
        .eq('is_active', true)
        .single();

      if (userOrgError || !userOrgData) {
        throw new Error('User is not associated with any organization');
      }

      // Create session
      const { data: sessionData, error: sessionError } = await supabase.rpc('create_user_session', {
        p_user_id: userData.id,
        p_organization_id: userOrgData.organization_id,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (sessionError || !sessionData) {
        throw new Error('Failed to create session');
      }

      // Store session token
      localStorage.setItem('session_token', sessionData);

      // Update state
      setUser(userData);
      setOrganization(userOrgData.organization);
      setUserRole(userOrgData.role);
      setIsAuthenticated(true);

      // Store in localStorage
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('organization_data', JSON.stringify(userOrgData.organization));
      localStorage.setItem('user_role', userOrgData.role);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.name}!`
      });

    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : 'An error occurred during login',
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      if (sessionToken) {
        // Invalidate session in database
        await supabase.rpc('invalidate_session', {
          p_session_token: sessionToken
        });
      }

      // Clear all storage
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('organization_data');
      localStorage.removeItem('user_role');

      // Reset state
      setUser(null);
      setOrganization(null);
      setUserRole('');
      setIsAuthenticated(false);

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out"
      });

    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local storage even if server call fails
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('organization_data');
      localStorage.removeItem('user_role');
      
      setUser(null);
      setOrganization(null);
      setUserRole('');
      setIsAuthenticated(false);
    }
  };



  const createOrganization = async (data: {
    name: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
  }) => {
    try {
      setIsLoading(true);

      // Generate slug
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if organization exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingOrg) {
        throw new Error('Organization already exists with this name');
      }

      // Check if owner email exists
      const { data: existingUser } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', data.ownerEmail)
        .single();

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug,
          admin_email: data.ownerEmail,
          admin_password_hash: data.ownerPassword, // Should be hashed in production
          is_active: true
        })
        .select()
        .single();

      if (orgError) {
        throw new Error('Failed to create organization');
      }

      // Create admin user
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .insert({
          email: data.ownerEmail,
          password_hash: data.ownerPassword, // Should be hashed in production
          name: data.ownerName,
          role: 'admin',
          is_verified: false
        })
        .select()
        .single();

      if (userError) {
        throw new Error('Failed to create admin user');
      }

      // Create user-organization relationship
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userData.id,
          organization_id: orgData.id,
          role: 'admin',
          joined_via: 'admin_creation',
          is_active: true
        });

      if (userOrgError) {
        throw new Error('Failed to associate user with organization');
      }

      toast({
        title: "Organization Created",
        description: "Your organization has been created successfully"
      });

    } catch (error) {
      console.error('Organization creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'An error occurred during organization creation',
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const joinOrganization = async (token: string, data: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);

      // Validate invitation token
      const { data: tokenData, error: tokenError } = await supabase.rpc('validate_invitation_token', {
        p_token: token
      });

      if (tokenError || !tokenData || tokenData.length === 0 || !tokenData[0].is_valid) {
        throw new Error('Invalid or expired invitation token');
      }

      const tokenInfo = tokenData[0];

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .insert({
          email: data.email,
          password_hash: data.password, // Should be hashed in production
          name: data.name,
          role: tokenInfo.role,
          is_verified: false
        })
        .select()
        .single();

      if (userError) {
        throw new Error('Failed to create user');
      }

      // Create user-organization relationship
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userData.id,
          organization_id: tokenInfo.organization_id,
          role: tokenInfo.role,
          joined_via: 'invitation',
          access_token_id: tokenInfo.token_id,
          is_active: true
        });

      if (userOrgError) {
        throw new Error('Failed to associate user with organization');
      }

      // Update token usage count
      await supabase
        .from('access_tokens')
        .update({ used_count: tokenInfo.used_count + 1 })
        .eq('id', tokenInfo.token_id);

      toast({
        title: "Joined Organization",
        description: "You have successfully joined the organization"
      });

    } catch (error) {
      console.error('Join organization failed:', error);
      toast({
        title: "Join Failed",
        description: error instanceof Error ? error.message : 'An error occurred while joining the organization',
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    await checkSession();
  };

  const sendOTP = async (email: string) => {
    try {
      // Generate secure OTP
      const otp = generateSecureOTP();
      
      // Send OTP via email using server endpoint
      const response = await fetch('http://localhost:5000/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      // Store OTP temporarily (in production, this should be server-side)
      sessionStorage.setItem('pending_otp', JSON.stringify({ email, otp, timestamp: Date.now() }));

      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code"
      });

    } catch (error) {
      console.error('Failed to send OTP:', error);
      toast({
        title: "OTP Failed",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      // Validate OTP format
      if (!isValidOTPFormat(otp)) {
        toast({
          title: "Invalid OTP",
          description: "Please enter a valid 6-digit code",
          variant: "destructive"
        });
        return false;
      }

      // Get stored OTP
      const storedOTPData = sessionStorage.getItem('pending_otp');
      if (!storedOTPData) {
        toast({
          title: "OTP Expired",
          description: "Please request a new verification code",
          variant: "destructive"
        });
        return false;
      }

      const { email: storedEmail, otp: storedOTP, timestamp } = JSON.parse(storedOTPData);
      
      // Check if email matches and OTP is not expired (5 minutes)
      if (email !== storedEmail || Date.now() - timestamp > 5 * 60 * 1000) {
        sessionStorage.removeItem('pending_otp');
        toast({
          title: "OTP Expired",
          description: "Please request a new verification code",
          variant: "destructive"
        });
        return false;
      }

      // Verify OTP
      if (otp !== storedOTP) {
        toast({
          title: "Invalid OTP",
          description: "The verification code is incorrect",
          variant: "destructive"
        });
        return false;
      }

      // Clear stored OTP
      sessionStorage.removeItem('pending_otp');

      toast({
        title: "OTP Verified",
        description: "Email verification successful"
      });

      return true;

    } catch (error) {
      console.error('OTP verification failed:', error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    organization,
    userRole,
    isLoading,
    isAuthenticated,
    login,
    logout,
    createOrganization,
    joinOrganization,
    sendOTP,
    verifyOTP,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 