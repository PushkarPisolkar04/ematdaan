import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  createOrganization,
  validateAccessCode,
  validateInvitationToken,
  registerUser,
  loginUser,
  verifyUserEmail,
  getUserOrganizations,
  createSession,
  createInvitationToken
} from '@/lib/api/traditionalAuth';
import { verifyOTP, sendOTP } from '@/lib/otp';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, Shield, Users, Building, Key, ArrowRight, HelpCircle, Info } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [authMode, setAuthMode] = useState<'access_code' | 'invitation' | 'organization' | 'organization_created' | 'direct_login'>('direct_login');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form data
  const [accessCode, setAccessCode] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [orgData, setOrgData] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: ''
  });
  const [otpData, setOtpData] = useState({
    otp: ''
  });

  // Organization and role context
  const [organization, setOrganization] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [tokenId, setTokenId] = useState<string>('');

  // Check for invitation token in URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setInvitationToken(token);
      setAuthMode('invitation');
      handleValidateInvitation(token);
    }
  }, [searchParams]);

  // Check for organization creation state
  useEffect(() => {
    if (location.state?.mode === 'organization_created' && location.state?.organization) {
      setOrganization(location.state.organization);
      setAuthMode('organization_created');
      setShowOTP(true);
      setTimeLeft(300); // 5 minutes
      toast({
        title: "Organization Created Successfully!",
        description: "Please check your email for the verification code to complete setup"
      });
    }
  }, [location.state, toast]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleValidateAccessCode = async () => {
    if (!accessCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an access code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await validateAccessCode(accessCode);
      setOrganization(result.organization);
      setUserRole(result.role);
      setAuthMode('access_code');
      
      toast({
        title: "Access Code Valid",
        description: `You're joining ${result.organization.name} as a ${result.role}`
      });
    } catch (error) {
      console.error('Access code validation error:', error);
      toast({
        title: "Invalid Access Code",
        description: error instanceof Error ? error.message : 'Please check your access code',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateInvitation = async (token: string) => {
    setIsLoading(true);
    try {
      const result = await validateInvitationToken(token);
      setOrganization(result.organization);
      setUserRole(result.role);
      setTokenId(result.tokenId);
      setAuthMode('invitation');
      
      toast({
        title: "Invitation Valid",
        description: `You're joining ${result.organization.name} as a ${result.role}`
      });
    } catch (error) {
      console.error('Invitation validation error:', error);
      toast({
        title: "Invalid Invitation",
        description: error instanceof Error ? error.message : 'Please check your invitation link',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (orgData.password !== orgData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createOrganization({
        name: orgData.name,
        ownerName: orgData.ownerName,
        ownerEmail: orgData.ownerEmail,
        ownerPassword: orgData.password
      });
      
      console.log('Organization creation result:', result);
      console.log('User from result:', result.user);
      console.log('Organization from result:', result.organization);
      console.log('Access codes from result:', result.accessCodes);

      if (result.otpSent) {
        setShowOTP(true);
        setTimeLeft(300); // 5 minutes
        
        // Store access codes and user info in location state for later display
        if (result.accessCodes) {
          console.log('Storing state for auto-login:', {
            organization: result.organization,
            user: result.user,
            accessCodes: result.accessCodes
          });
          
          navigate(location.pathname, {
            state: {
              organization: result.organization,
              user: result.user, // Store user info for auto-login
              ownerEmail: orgData.ownerEmail,
              mode: 'organization_created',
              accessCodes: result.accessCodes
            },
            replace: true
          });
        }
        
        toast({
          title: "Organization Created Successfully!",
          description: "Please check your email for verification code and access codes"
        });
      }
    } catch (error) {
      console.error('Organization creation error:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create organization',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerUser({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        organizationId: organization.id,
        role: userRole,
        tokenId: tokenId,
        joinedVia: authMode
      });

      if (result.otpSent) {
          setShowOTP(true);
        setTimeLeft(300); // 5 minutes
          toast({
          title: "Registration Successful",
          description: "Please check your email for verification code"
          });
        }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : 'Failed to register',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      // First, get user's organizations
      const { data: user, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', loginData.email)
        .single();

      if (userError || !user) {
        throw new Error('User not found. Please check your email or register first.');
      }

      // Get user's organizations
      const userOrgs = await getUserOrganizations(user.id);
      
      if (!userOrgs || userOrgs.length === 0) {
        throw new Error('No organizations found. Please join an organization first.');
      }

      // If user has multiple organizations, use the first active one
      const activeOrg = userOrgs.find(org => org.is_active) || userOrgs[0];
      
      // Now login with the organization
      const result = await loginUser({
        email: loginData.email,
        password: loginData.password,
        organizationId: activeOrg.organization_id
      });

      // Store session
      localStorage.setItem('session_token', result.sessionToken);
      localStorage.setItem('user_id', result.user.id);
      localStorage.setItem('user_email', result.user.email);
      localStorage.setItem('user_role', result.userOrganization.role);
      localStorage.setItem('organization_id', activeOrg.organization_id);
      localStorage.setItem('isAuthenticated', 'true');

      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.name}!`
      });

      // Redirect based on role
      if (result.userOrganization.role === 'org_owner' || result.userOrganization.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Direct login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginUser({
        email: loginData.email,
        password: loginData.password,
        organizationId: organization.id
      });

      // Store session
      localStorage.setItem('session_token', result.sessionToken);
      localStorage.setItem('user_id', result.user.id);
      localStorage.setItem('user_email', result.user.email);
      localStorage.setItem('user_role', result.userOrganization.role);
      localStorage.setItem('organization_id', organization.id);
      localStorage.setItem('isAuthenticated', 'true');

      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.name}!`
      });

      // Redirect based on role
      if (result.userOrganization.role === 'org_owner' || result.userOrganization.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      let emailToVerify;
      
      if (authMode === 'organization_created') {
        // For organization creation, verify the owner's email
        emailToVerify = location.state?.ownerEmail;
      } else {
        // For regular login/registration
        emailToVerify = registerData.email || orgData.ownerEmail;
      }
      
      // Update user as verified (this also verifies the OTP)
      const user = await verifyUserEmail(emailToVerify, otpData.otp);

      if (authMode === 'organization_created') {
        // Show access codes to admin after verification
        const accessCodes = location.state?.accessCodes;
        const organization = location.state?.organization;
        
        if (accessCodes || organization) {
          const voterCode = accessCodes?.voterCode || organization?.voter_access_code;
          const adminCode = accessCodes?.adminCode || organization?.admin_access_code;
          
          // Create secure invitation link if not available
          let invitationText = '';
          if (accessCodes?.invitationLink) {
            invitationText = `\n🔗 Invitation Link:\n${accessCodes.invitationLink}`;
          } else if (organization) {
            // Create a secure invitation token
            try {
              const userData = location.state?.user || await supabase
                .from('auth_users')
                .select('*')
                .eq('email', location.state?.ownerEmail)
                .single()
                .then(result => result.data);
              
              if (userData) {
                const invitationToken = await createInvitationToken({
                  organizationId: organization.id,
                  role: 'admin',
                  expiresInDays: 7,
                  usageLimit: 10,
                  createdBy: userData.id
                });
                
                                 if (invitationToken && invitationToken.token) {
                   const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
                   invitationText = `\n🔗 Secure Invitation Link:\n${baseUrl}/login?token=${invitationToken.token}`;
                 }
              }
            } catch (error) {
              console.error('Failed to create invitation token');
            }
          }
          
          // Show success toast first
          toast({
            title: "🎉 Email Verified Successfully!",
            description: "Your organization is now active. Access codes have been sent to your email.",
            duration: 5000
          });
          
          // Show access codes in a better format after a short delay
          setTimeout(() => {
            toast({
              title: "📋 Your Organization Access Codes",
              description: `Voter: ${voterCode} | Admin: ${adminCode}`,
              duration: 10000
            });
          }, 1000);
        }
        
        // Automatically create session for the admin
        try {
          console.log('Location state in OTP verification:', location.state);
          const user = location.state?.user;
          const organization = location.state?.organization;
          const ownerEmail = location.state?.ownerEmail;
          
          console.log('User data:', user);
          console.log('Organization data:', organization);
          console.log('Owner email:', ownerEmail);
          
          if (organization && ownerEmail) {
            // If user data is missing, fetch it from database
            let userData = user;
            if (!userData) {
              console.log('Fetching user data from database for email:', ownerEmail);
              const { data: fetchedUser, error: fetchError } = await supabase
                .from('auth_users')
                .select('*')
                .eq('email', ownerEmail)
                .single();
              
              if (fetchError || !fetchedUser) {
                throw new Error('Could not fetch user data');
              }
              userData = fetchedUser;
              console.log('Fetched user data:', userData);
            }
            
            // Create session directly using the createSession function
            console.log('Creating session for user:', userData.id, 'organization:', organization.id);
            const sessionToken = await createSession(userData.id, organization.id);
            console.log('Session created successfully:', sessionToken);
            
            // Store session
            localStorage.setItem('session_token', sessionToken);
            localStorage.setItem('user_id', userData.id);
            localStorage.setItem('user_email', userData.email);
            localStorage.setItem('user_role', 'org_owner');
            localStorage.setItem('organization_id', organization.id);
            localStorage.setItem('isAuthenticated', 'true');
            
            // Navigate to admin dashboard
            navigate('/admin', { 
              state: { 
                organization: organization,
                userRole: 'org_owner'
              }
            });
            
            toast({
              title: "Welcome to Admin Dashboard!",
              description: "You have been automatically logged in"
            });
          } else {
            throw new Error('Missing organization or owner email data');
          }
        } catch (sessionError) {
          console.error('Auto-login failed:', sessionError);
          // If auto-login fails, redirect to login with organization selected
          setOrganization(location.state?.organization);
          setUserRole('org_owner');
          setActiveTab('login');
          setShowOTP(false);
          setOtpData({ otp: '' });
          toast({
            title: "Email Verified",
            description: "Please log in with your password to access admin dashboard"
          });
        }
      } else {
        // Switch to login tab for regular users
        setActiveTab('login');
        setLoginData({ email: emailToVerify, password: '' });
        setShowOTP(false);
        setOtpData({ otp: '' });
        
        toast({
          title: "Email Verified",
          description: "Your account has been successfully verified!"
        });
      }

    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : 'Invalid OTP',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      // Re-register to send new OTP
      if (authMode === 'organization') {
        await createOrganization({
          name: orgData.name,
          ownerName: orgData.ownerName,
          ownerEmail: orgData.ownerEmail,
          ownerPassword: orgData.password
        });
      } else if (authMode === 'organization_created') {
        // For organization creation, we can't recreate the organization
        // Just send a new OTP to the owner's email
        const result = await sendOTP(location.state?.ownerEmail);
        console.log('Resend OTP result:', result);
      } else {
        await registerUser({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
          organizationId: organization.id,
          role: userRole,
          tokenId: tokenId,
          joinedVia: authMode
        });
      }
      
      setTimeLeft(300);
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20">
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-5rem)]">
          {/* Help Section */}
          <div className="hidden lg:block">
            <Card className="h-full bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
                  <HelpCircle className="h-6 w-6" />
                  Quick Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-green-800">Existing Users:</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">• Click "Login" to sign in directly</p>
                    <p className="text-gray-700">• Use your email and password</p>
                    <p className="text-gray-700">• Access your dashboard instantly</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 text-blue-800">New Users:</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">• Get access code from your organization admin</p>
                    <p className="text-gray-700">• Click "Join Org" and enter the code</p>
                    <p className="text-gray-700">• Register and verify your email</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 text-purple-800">Organization Owners:</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">• Click "Create Org" to set up organization</p>
                    <p className="text-gray-700">• Generate access codes for your members</p>
                    <p className="text-gray-700">• Create and manage elections</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Need help?</strong> Contact your organization administrator for access codes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Login Form */}
          <Card className="w-full max-h-[calc(100vh-4rem)] overflow-y-auto">
            <CardHeader className="text-center sticky top-0 bg-white z-10">
              <CardTitle className="text-2xl">
                {organization ? organization.name : ''}
              </CardTitle>
              <CardDescription>
                {showOTP ? 'Verify your email' : 
                 organization ? `Join as ${userRole}` : 
                 ''}
              </CardDescription>
            </CardHeader>
        <CardContent>
          {showOTP ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={otpData.otp}
                    onChange={(e) => setOtpData({ otp: e.target.value })}
                    placeholder="Enter 6-digit code"
                    className="pl-10"
                    maxLength={6}
                    required
                  />
                </div>
                

              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
                  
              <div className="text-center">
                {timeLeft > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend code in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                ) : (
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={resendOTP}
                    className="text-sm"
                  >
                    Resend Code
                  </Button>
                )}
                

              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowOTP(false);
                  setActiveTab('login');
                }}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Auth Mode Selection */}
              {!organization && (
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAuthMode('direct_login')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                      authMode === 'direct_login'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('access_code')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                      authMode === 'access_code'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Key className="h-4 w-4" />
                    Join Org
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('organization')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                      authMode === 'organization'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building className="h-4 w-4" />
                    Create Org
                  </button>
                </div>
              )}

              {/* Direct Login Form */}
              {authMode === 'direct_login' && !organization && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Welcome Back!</h3>
                    <p className="text-sm text-gray-600">Sign in to your account</p>
                  </div>
                  
                  <form onSubmit={handleDirectLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          placeholder="Enter your email"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          placeholder="Enter your password"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    
                    <div className="text-center">
                      <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Forgot your password?
                      </Link>
                    </div>
                  </form>
                </div>
              )}

              {/* Access Code Input */}
              {authMode === 'access_code' && !organization && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Code
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Enter your access code"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleValidateAccessCode}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Validating...' : 'Continue'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Organization Creation */}
              {authMode === 'organization' && !organization && (
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={orgData.name}
                        onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                        placeholder="Enter organization name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={orgData.ownerName}
                        onChange={(e) => setOrgData({ ...orgData, ownerName: e.target.value })}
                        placeholder="Enter your full name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        value={orgData.ownerEmail}
                        onChange={(e) => setOrgData({ ...orgData, ownerEmail: e.target.value })}
                        placeholder="Enter your email"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="password"
                        value={orgData.password}
                        onChange={(e) => setOrgData({ ...orgData, password: e.target.value })}
                        placeholder="Create a password"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="password"
                        value={orgData.confirmPassword}
                        onChange={(e) => setOrgData({ ...orgData, confirmPassword: e.target.value })}
                        placeholder="Confirm your password"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Organization...' : 'Create Organization'}
                  </Button>
                </form>
              )}

              {/* Registration Form for Organization Join */}
              {organization && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Join {organization.name}</h3>
                    <p className="text-sm text-gray-600">Create your account to get started</p>
                  </div>
              
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          placeholder="Enter your full name"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          placeholder="Enter your email"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          placeholder="Create a password"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          placeholder="Confirm your password"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
              

              </div>
              )}

              {/* Back to main options */}
              {organization && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setOrganization(null);
                    setUserRole('');
                    setTokenId('');
                    setAccessCode('');
                    setInvitationToken('');
                  }}
                >
                  Back to Options
                </Button>
              )}
            </div>
          )}
        </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;