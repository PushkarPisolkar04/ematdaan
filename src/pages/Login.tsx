import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { invitationApi } from '@/lib/invitationApi';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, createOrganization, verifyOrganizationOTP, joinOrganization, userRole } = useAuth();

  // Form data
  const [invitationToken, setInvitationToken] = useState('');
  const [invitationValidation, setInvitationValidation] = useState<any>(null);
  const [validatingInvitation, setValidatingInvitation] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [orgData, setOrgData] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: ''
  });
  const [joinData, setJoinData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Check for invitation token or tab in URL
  useEffect(() => {
    const token = searchParams.get('invitation');
    const tab = searchParams.get('tab');
    
    if (token) {
      // Decode the token and fix spaces to + characters
      const decodedToken = decodeURIComponent(token).replace(/ /g, '+');
      setInvitationToken(decodedToken);
      setActiveTab('join');
      validateInvitation(decodedToken);
    } else if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const validateInvitation = async (token: string) => {
    if (!token.trim()) {
      setInvitationValidation(null);
      return;
    }

    try {
      setValidatingInvitation(true);
      const validation = await invitationApi.validateInvitationToken(token);
      setInvitationValidation(validation);
      
      if (validation.is_valid) {
        // Auto-fill the email field with the invitation email
        setJoinData(prev => ({ ...prev, email: validation.email }));
      }
    } catch (error) {
      setInvitationValidation({
        is_valid: false,
        reason: 'Failed to validate invitation'
      });
    } finally {
      setValidatingInvitation(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
    setIsLoading(true);
      await login(loginData.email, loginData.password);
      // Redirect based on user role
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgData.name || !orgData.ownerName || !orgData.ownerEmail || !orgData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (orgData.password !== orgData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await createOrganization({
        name: orgData.name,
        ownerName: orgData.ownerName,
        ownerEmail: orgData.ownerEmail,
        ownerPassword: orgData.password
      });
      
      if (result.requiresOTP) {
        // Show OTP form
        setShowOTPForm(true);
        setPendingEmail(orgData.ownerEmail);
        toast({
          title: "OTP Sent",
          description: "Please check your email for the verification code",
        });
      } else {
        // Organization created without OTP
        toast({
          title: "Organization Created",
          description: "Your organization has been created successfully. You can now log in."
        });
        setActiveTab('login');
        setLoginData({ email: orgData.ownerEmail, password: '' });
      }
    } catch (error) {
      console.error('Organization creation failed:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create organization',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpValue.trim()) {
      toast({
        title: "OTP Required",
        description: "Please enter the verification code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await verifyOrganizationOTP(pendingEmail, otpValue);
      
      // Close the OTP form
      setShowOTPForm(false);
      setOtpValue('');
      setPendingEmail('');
      
      // Reset form data
      setOrgData({
        name: '',
        ownerName: '',
        ownerEmail: '',
        password: '',
        confirmPassword: ''
      });
      
      toast({
        title: "Organization Created",
        description: "Your organization has been created successfully! You can now log in."
      });
      
      // Switch to login tab with email pre-filled
      setActiveTab('login');
      setLoginData({ email: orgData.ownerEmail, password: '' });
    } catch (error) {
      console.error('OTP verification error:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : 'Failed to verify OTP',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationToken || !joinData.name || !joinData.email || !joinData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and provide a valid invitation token",
        variant: "destructive"
      });
      return;
    }

    if (!invitationValidation?.is_valid) {
      toast({
        title: "Invalid Invitation",
        description: "Please provide a valid invitation token",
        variant: "destructive"
      });
      return;
    }

    if (joinData.password !== joinData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await joinOrganization(invitationToken, {
        name: joinData.name,
        email: joinData.email,
        password: joinData.password
      });
      toast({
        title: "Joined Organization",
        description: "You have successfully joined the organization"
      });
          setActiveTab('login');
      setLoginData({ email: joinData.email, password: '' });
    } catch (error) {
      toast({
        title: "Join Failed",
        description: error instanceof Error ? error.message : 'Failed to join organization',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-start justify-center p-4 pt-20">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
        {/* Left Side - Auth Form */}
        <div className="flex items-start justify-center">
          <div className="w-full max-w-md">
            <Card className="w-full shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">Sign In</CardTitle>
                <CardDescription className="text-gray-600">Access your voting platform</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-12 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Login</TabsTrigger>
                    <TabsTrigger value="join" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Join Org</TabsTrigger>
                    <TabsTrigger value="create" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Create Org</TabsTrigger>
                  </TabsList>

                  {/* Login Tab */}
                  <TabsContent value="login" className="space-y-3 mt-3">
                    <form onSubmit={handleLogin} className="space-y-2">
                      <div className="space-y-1">
                        <label htmlFor="login-email" className="text-sm font-semibold text-gray-700">Email Address</label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="login-password" className="text-sm font-semibold text-gray-700">Password</label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-9 text-sm font-semibold bg-[#6B21E8] hover:bg-[#6B21E8]/90" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    </form>

                  </TabsContent>

                  {/* Join Organization Tab */}
                  <TabsContent value="join" className="space-y-3 mt-3">
                    <form onSubmit={handleJoinOrganization} className="space-y-2">
                                            <div className="space-y-1">
                        <label htmlFor="invitation-token" className="text-sm font-semibold text-gray-700">
                          Invitation Token
                          {searchParams.get('invitation') && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700">
                              From Link
                            </Badge>
                          )}
                        </label>
                        <Input
                          id="invitation-token"
                          type="text"
                          placeholder="Enter invitation token"
                          value={invitationToken}
                          onChange={(e) => {
                            setInvitationToken(e.target.value);
                            validateInvitation(e.target.value);
                          }}
                          className="h-9 text-sm"
                          required
                        />
                        {validatingInvitation && (
                          <p className="text-xs text-blue-600">Validating invitation...</p>
                        )}
                        {invitationValidation && (
                          <div className="mt-2">
                            {invitationValidation.is_valid ? (
                              <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">
                                  Valid invitation for <strong>{invitationValidation.email}</strong>
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-700">
                                  {invitationValidation.reason}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="join-name" className="text-sm font-semibold text-gray-700">Full Name</label>
                      <Input
                          id="join-name"
                        type="text"
                        placeholder="Enter your full name"
                          value={joinData.name}
                          onChange={(e) => setJoinData({ ...joinData, name: e.target.value })}
                          className="h-9 text-sm"
                        required
                      />
                    </div>
                                            <div className="space-y-1">
                        <label htmlFor="join-email" className="text-sm font-semibold text-gray-700">
                          Email
                          {invitationValidation?.is_valid && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                              <Mail className="h-3 w-3 mr-1" />
                              From Invitation
                            </Badge>
                          )}
                        </label>
                        <Input
                          id="join-email"
                          type="email"
                          placeholder={invitationValidation?.is_valid ? "Email from invitation" : "Enter your email"}
                          value={joinData.email}
                          onChange={(e) => setJoinData({ ...joinData, email: e.target.value })}
                          className={`h-9 text-sm ${invitationValidation?.is_valid ? 'bg-gray-50 border-gray-300 text-gray-600' : ''}`}
                          disabled={invitationValidation?.is_valid}
                          required
                        />
                        {invitationValidation?.is_valid && (
                          <p className="text-xs text-gray-500">
                            Email is locked to the invitation address for security
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="join-password" className="text-sm font-semibold text-gray-700">Password</label>
                      <Input
                          id="join-password"
                        type="password"
                        placeholder="Create a password"
                          value={joinData.password}
                          onChange={(e) => setJoinData({ ...joinData, password: e.target.value })}
                          className="h-9 text-sm"
                        required
                      />
                    </div>
                      <div className="space-y-1">
                        <label htmlFor="join-confirm" className="text-sm font-semibold text-gray-700">Confirm Password</label>
                      <Input
                          id="join-confirm"
                        type="password"
                        placeholder="Confirm your password"
                          value={joinData.confirmPassword}
                          onChange={(e) => setJoinData({ ...joinData, confirmPassword: e.target.value })}
                          className="h-9 text-sm"
                        required
                      />
                    </div>
                      <Button type="submit" className="w-full h-9 text-sm font-semibold bg-[#6B21E8] hover:bg-[#6B21E8]/90" disabled={isLoading}>
                        {isLoading ? 'Joining organization...' : 'Join Organization'}
                  </Button>
                </form>
                  </TabsContent>

                  {/* Create Organization Tab */}
                  <TabsContent value="create" className="space-y-3 mt-3">
                    <form onSubmit={handleCreateOrganization} className="space-y-2">
                      <div className="space-y-1">
                        <label htmlFor="org-name" className="text-sm font-semibold text-gray-700">Organization Name</label>
                        <Input
                          id="org-name"
                          type="text"
                          placeholder="Enter organization name"
                          value={orgData.name}
                          onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="owner-name" className="text-sm font-semibold text-gray-700">Admin Name</label>
                        <Input
                          id="owner-name"
                          type="text"
                          placeholder="Enter admin name"
                          value={orgData.ownerName}
                          onChange={(e) => setOrgData({ ...orgData, ownerName: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="owner-email" className="text-sm font-semibold text-gray-700">Admin Email</label>
                        <Input
                          id="owner-email"
                          type="email"
                          placeholder="Enter admin email"
                          value={orgData.ownerEmail}
                          onChange={(e) => setOrgData({ ...orgData, ownerEmail: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="owner-password" className="text-sm font-semibold text-gray-700">Admin Password</label>
                        <Input
                          id="owner-password"
                          type="password"
                          placeholder="Create admin password"
                          value={orgData.password}
                          onChange={(e) => setOrgData({ ...orgData, password: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="owner-confirm" className="text-sm font-semibold text-gray-700">Confirm Password</label>
                        <Input
                          id="owner-confirm"
                          type="password"
                          placeholder="Confirm admin password"
                          value={orgData.confirmPassword}
                          onChange={(e) => setOrgData({ ...orgData, confirmPassword: e.target.value })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-9 text-sm font-semibold bg-[#6B21E8] hover:bg-[#6B21E8]/90" disabled={isLoading}>
                        {isLoading ? 'Creating organization...' : 'Create Organization'}
                      </Button>
                    </form>

                    {/* OTP Verification Form */}
                    {showOTPForm && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Verify Your Email</h3>
                        <p className="text-xs text-gray-600 mb-3">
                          Enter the 6-digit code sent to <strong>{pendingEmail}</strong>
                        </p>
                        <form onSubmit={handleVerifyOTP} className="space-y-3">
                          <div className="space-y-1">
                            <label htmlFor="otp-code" className="text-sm font-semibold text-gray-700">Verification Code</label>
                            <Input
                              id="otp-code"
                              type="text"
                              placeholder="Enter 6-digit code"
                              value={otpValue}
                              onChange={(e) => setOtpValue(e.target.value)}
                              maxLength={6}
                              className="h-9 text-sm text-center tracking-widest"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              type="submit" 
                              className="flex-1 h-9 text-sm font-semibold bg-[#6B21E8] hover:bg-[#6B21E8]/90" 
                              disabled={isLoading}
                            >
                              {isLoading ? 'Verifying...' : 'Verify & Create'}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline"
                              className="h-9 text-sm"
                              onClick={() => {
                                setShowOTPForm(false);
                                setOtpValue('');
                                setPendingEmail('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Instructions */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-3">How to Get Started</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Already have an account?</h3>
                  <p className="text-xs text-gray-600">Use the <strong>Login</strong> tab to sign in with your email and password. This is for existing users who have already registered with an organization.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Invited to join an organization?</h3>
                  <p className="text-xs text-gray-600">Use the <strong>Join Org</strong> tab with your invitation token. You'll need the token from your organization admin to create your account and join their voting platform.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Want to create a new organization?</h3>
                  <p className="text-xs text-gray-600">Use the <strong>Create Org</strong> tab to set up your own voting platform. This is for administrators who want to manage their own elections and invite members.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-3">What You Can Do</h3>
                    </div>
                    
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Vote in Elections</h4>
                  <p className="text-xs text-gray-600">Participate in secure, encrypted voting with verification receipts</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Verify Your Vote</h4>
                  <p className="text-xs text-gray-600">Use your receipt to confirm your vote was counted correctly</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">View Results</h4>
                  <p className="text-xs text-gray-600">See real-time election results and detailed analytics</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Manage Members</h4>
                  <p className="text-xs text-gray-600">Invite and manage organization members (Admin only)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;