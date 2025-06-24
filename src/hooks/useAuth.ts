import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { connectMetaMask, disconnectMetaMask, getCurrentAddress } from '@/lib/metamask';
import { generateDID } from '@/lib/did';
import { sendOTP, verifyOTP } from '@/lib/otp';

export interface AuthState {
  isAuthenticated: boolean;
  isConnected: boolean;
  address: string | null;
  did: string | null;
  isAdmin: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  // Add other user properties as needed
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isConnected: false,
    address: null,
    did: null,
    isAdmin: false,
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize auth state from localStorage and check MetaMask connection
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check localStorage first
        const storedAuth = localStorage.getItem('auth');
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const userDID = localStorage.getItem('userDID');
        
        if (storedAuth) {
          const parsedAuth = JSON.parse(storedAuth);
          
          // Verify MetaMask is still connected
          const currentAddress = await getCurrentAddress();
          if (currentAddress && currentAddress.toLowerCase() === parsedAuth.address?.toLowerCase()) {
            // Still connected, restore full auth state
            setAuthState({
              ...parsedAuth,
              isAuthenticated: isAuthenticated,
              did: userDID,
              isConnected: true,
              address: currentAddress
            });
            return;
          }
        }

        // If we get here, either no stored auth or MetaMask disconnected
        const currentAddress = await getCurrentAddress();
        if (currentAddress) {
          const isAdmin = currentAddress.toLowerCase() === import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();
          const newState = {
            isConnected: true,
            address: currentAddress,
            isAdmin,
            isAuthenticated: isAuthenticated,
            did: userDID
          };
          setAuthState(newState);
          localStorage.setItem('auth', JSON.stringify(newState));
        } else {
          // No connection, clear auth state
          setAuthState({
            isAuthenticated: false,
            isConnected: false,
            address: null,
            did: null,
            isAdmin: false
          });
          localStorage.removeItem('auth');
          if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    initializeAuth();

    // Listen for account changes
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setAuthState({
          isAuthenticated: false,
          isConnected: false,
          address: null,
          did: null,
          isAdmin: false
        });
        localStorage.removeItem('auth');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userDID');
        navigate('/');
      } else {
        // Account changed
        const newAddress = accounts[0];
        const isAdmin = newAddress.toLowerCase() === import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();
        const newState = {
          ...authState,
          isConnected: true,
          address: newAddress,
          isAdmin,
          isAuthenticated: false,
          did: null
        };
        setAuthState(newState);
        localStorage.setItem('auth', JSON.stringify(newState));
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userDID');
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      // Also listen for chainChanged
      window.ethereum.on('chainChanged', () => {
        // Reload the page on chain change as recommended by MetaMask
        window.location.reload();
      });
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
      };
    }
  }, [navigate]);

  // Save auth state to localStorage
  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem('auth', JSON.stringify(authState));
    } else {
      localStorage.removeItem('auth');
    }
  }, [authState]);

  // Connect to MetaMask
  const connect = useCallback(async () => {
    try {
      const { address } = await connectMetaMask();
      const isAdmin = address.toLowerCase() === import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();

      setAuthState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        isAdmin,
      }));

      return { address, isAdmin };
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Please make sure MetaMask is installed and unlocked',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Register new user
  const register = useCallback(async (
    email: string,
    name: string,
    dob: string
  ) => {
    try {
      if (!authState.address) {
        throw new Error('Wallet not connected');
      }

      // Generate DID
      const didDoc = await generateDID(authState.address);

      // Send OTP
      const otpResponse = await sendOTP(email);
      if (!otpResponse.success) {
        throw new Error(otpResponse.message);
      }

      // Store registration data temporarily
      sessionStorage.setItem('registration', JSON.stringify({
        email,
        name,
        dob,
        did: didDoc.id,
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
  }, [authState.address, toast]);

  // Complete registration with OTP
  const verifyRegistration = useCallback(async (otp: string) => {
    try {
      const registration = sessionStorage.getItem('registration');
      if (!registration) {
        throw new Error('Registration data not found');
      }

      const { email, name, dob, did } = JSON.parse(registration);

      // Verify OTP
      const otpResponse = await verifyOTP(email, otp);
      if (!otpResponse.success) {
        throw new Error(otpResponse.message);
      }

      // Update auth state
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        did,
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

      // Generate DID
      const didDoc = await generateDID(authState.address!);

      // Update auth state
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: true,
        did: didDoc.id,
      }));

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
  }, [authState.address, navigate, toast]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await disconnectMetaMask();
      setAuthState({
        isAuthenticated: false,
        isConnected: false,
        address: null,
        did: null,
        isAdmin: false,
      });
      localStorage.removeItem('auth');
      navigate('/');
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Failed to disconnect from MetaMask',
        variant: 'destructive',
      });
    }
  }, [navigate, toast]);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      const address = await getCurrentAddress();
      if (!address) {
        setAuthState((prev) => ({
          ...prev,
          isConnected: false,
          address: null,
        }));
        return false;
      }

      const isAdmin = address.toLowerCase() === import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();

      setAuthState((prev) => ({
        ...prev,
        isConnected: true,
        address,
        isAdmin,
      }));

      return true;
    } catch (error) {
      return false;
    }
  }, []);

  return {
    authState,
    connect,
    register,
    verifyRegistration,
    login,
    verifyLogin,
    logout,
    checkAuth,
  };
}; 