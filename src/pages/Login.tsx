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
  getUserOrganizations
} from '@/lib/api/traditionalAuth';
import { verifyOTP, sendOTP } from '@/lib/otp';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, Shield, Users, Building, Key, ArrowRight, HelpCircle, Info } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [authMode, setAuthMode] = useState<'access_code' | 'invitation' | 'organization' | 'organization_created'>('access_code');
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

      if (result.otpSent) {
        setShowOTP(true);
        setTimeLeft(300); // 5 minutes
        toast({
          title: "Organization Created Successfully!",
          description: "Please check your email for verification code"
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
      
      console.log('Location state:', location.state);
      console.log('Auth mode:', authMode);
      
      if (authMode === 'organization_created') {
        // For organization creation, verify the owner's email
        emailToVerify = location.state?.ownerEmail;
        console.log('Email to verify (org created):', emailToVerify);
      } else {
        // For regular login/registration
        emailToVerify = registerData.email || orgData.ownerEmail;
        console.log('Email to verify (regular):', emailToVerify);
      }
      
      // Update user as verified (this also verifies the OTP)
      const user = await verifyUserEmail(emailToVerify, otpData.otp);

      toast({
        title: "Email Verified",
        description: "Your account has been successfully verified!"
      });

      if (authMode === 'organization_created') {
        // Navigate to admin dashboard for organization owners
        navigate('/admin', { 
          state: { 
            organization: location.state.organization,
            userRole: 'org_owner'
          }
        });
      } else {
        // Switch to login tab for regular users
        setActiveTab('login');
        setLoginData({ email: emailToVerify, password: '' });
        setShowOTP(false);
        setOtpData({ otp: '' });
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
                  <h4 className="font-semibold text-lg mb-2 text-blue-800">For Voters:</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">• Get access code from your organization admin</p>
                    <p className="text-gray-700">• Enter the code above to sign in</p>
                    <p className="text-gray-700">• Verify your email and start voting</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2 text-purple-800">For Admins:</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">• Click "Create Org" tab to set up organization</p>
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
                
                {/* Debug button for development */}
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase
                          .from('otps')
                          .select('*')
                          .eq('email', location.state?.ownerEmail || '')
                          .order('created_at', { ascending: false })
                          .limit(5);
                        console.log('Debug - OTPs in database:', { data, error });
                      } catch (err) {
                        console.error('Debug error:', err);
                      }
                    }}
                    className="text-xs mt-2"
                  >
                    Debug: Check OTPs
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
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAuthMode('access_code')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      authMode === 'access_code'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Key className="h-4 w-4" />
                    Access Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('organization')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
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

              {/* Login/Register Tabs */}
              {organization && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
                  <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
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
              </TabsContent>
              
                  <TabsContent value="register" className="space-y-4 mt-4">
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
              </TabsContent>
            </Tabs>
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
