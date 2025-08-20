import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User, Shield, Users, Building, Key, ArrowRight, HelpCircle, Info, CheckCircle } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, register, createOrganization, joinOrganization } = useAuth();

  // Form data
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
  const [joinData, setJoinData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Check for invitation token in URL
  useEffect(() => {
    const token = searchParams.get('invitation');
    if (token) {
      setInvitationToken(token);
      setActiveTab('join');
    }
  }, [searchParams]);

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
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
      
    if (!registerData.email || !registerData.password || !registerData.name) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await register(registerData.email, registerData.password, registerData.name);
      toast({
        title: "Registration Successful",
        description: "You can now log in with your credentials"
      });
      setActiveTab('login');
      setLoginData({ email: registerData.email, password: '' });
    } catch (error) {
      console.error('Registration failed:', error);
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
      await createOrganization({
        name: orgData.name,
        ownerName: orgData.ownerName,
        ownerEmail: orgData.ownerEmail,
        ownerPassword: orgData.password
      });
      toast({
        title: "Organization Created",
        description: "Your organization has been created successfully. You can now log in."
      });
      setActiveTab('login');
      setLoginData({ email: orgData.ownerEmail, password: '' });
    } catch (error) {
      console.error('Organization creation failed:', error);
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
        description: "You have successfully joined the organization. You can now log in."
            });
          setActiveTab('login');
      setLoginData({ email: joinData.email, password: '' });
    } catch (error) {
      console.error('Join organization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Auth Forms */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to E-Matdaan</h1>
            <p className="text-gray-600">Secure digital voting platform for organizations</p>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Choose how you want to access the platform</CardDescription>
            </CardHeader>
        <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                  <TabsTrigger value="create">Create Org</TabsTrigger>
                  <TabsTrigger value="join">Join Org</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-sm font-medium">Email</label>
                        <Input
                        id="login-email"
                          type="email"
                        placeholder="Enter your email"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          required
                        />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-sm font-medium">Password</label>
                        <Input
                        id="login-password"
                          type="password"
                        placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>
                    <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                        Forgot your password?
                      </Link>
                    </div>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="register-name" className="text-sm font-medium">Full Name</label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-email" className="text-sm font-medium">Email</label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-password" className="text-sm font-medium">Password</label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-confirm" className="text-sm font-medium">Confirm Password</label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                      />
                  </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                  </form>
                </TabsContent>

                {/* Create Organization Tab */}
                <TabsContent value="create" className="space-y-4">
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="org-name" className="text-sm font-medium">Organization Name</label>
                      <Input
                        id="org-name"
                        type="text"
                        placeholder="Enter organization name"
                        value={orgData.name}
                        onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="owner-name" className="text-sm font-medium">Admin Name</label>
                      <Input
                        id="owner-name"
                        type="text"
                        placeholder="Enter admin name"
                        value={orgData.ownerName}
                        onChange={(e) => setOrgData({ ...orgData, ownerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="owner-email" className="text-sm font-medium">Admin Email</label>
                      <Input
                        id="owner-email"
                        type="email"
                        placeholder="Enter admin email"
                        value={orgData.ownerEmail}
                        onChange={(e) => setOrgData({ ...orgData, ownerEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="owner-password" className="text-sm font-medium">Admin Password</label>
                      <Input
                        id="owner-password"
                        type="password"
                        placeholder="Create admin password"
                        value={orgData.password}
                        onChange={(e) => setOrgData({ ...orgData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="owner-confirm" className="text-sm font-medium">Confirm Password</label>
                      <Input
                        id="owner-confirm"
                        type="password"
                        placeholder="Confirm admin password"
                        value={orgData.confirmPassword}
                        onChange={(e) => setOrgData({ ...orgData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating organization...' : 'Create Organization'}
                  </Button>
                </form>
                </TabsContent>

                {/* Join Organization Tab */}
                <TabsContent value="join" className="space-y-4">
                  <form onSubmit={handleJoinOrganization} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="invitation-token" className="text-sm font-medium">Invitation Token</label>
                        <Input
                        id="invitation-token"
                          type="text"
                        placeholder="Enter invitation token"
                        value={invitationToken}
                        onChange={(e) => setInvitationToken(e.target.value)}
                          required
                        />
                      </div>
                    <div className="space-y-2">
                      <label htmlFor="join-name" className="text-sm font-medium">Full Name</label>
                      <Input
                        id="join-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={joinData.name}
                        onChange={(e) => setJoinData({ ...joinData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="join-email" className="text-sm font-medium">Email</label>
                        <Input
                        id="join-email"
                          type="email"
                          placeholder="Enter your email"
                        value={joinData.email}
                        onChange={(e) => setJoinData({ ...joinData, email: e.target.value })}
                          required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="join-password" className="text-sm font-medium">Password</label>
                        <Input
                        id="join-password"
                          type="password"
                          placeholder="Create a password"
                        value={joinData.password}
                        onChange={(e) => setJoinData({ ...joinData, password: e.target.value })}
                          required
                        />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="join-confirm" className="text-sm font-medium">Confirm Password</label>
                        <Input
                        id="join-confirm"
                          type="password"
                          placeholder="Confirm your password"
                        value={joinData.confirmPassword}
                        onChange={(e) => setJoinData({ ...joinData, confirmPassword: e.target.value })}
                          required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Joining organization...' : 'Join Organization'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Features */}
        <div className="hidden lg:block space-y-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose E-Matdaan?</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">End-to-End Encryption</h3>
                  <p className="text-sm text-gray-600">Your votes are encrypted and secure from start to finish</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Vote Verification</h3>
                  <p className="text-sm text-gray-600">Verify your vote with unique receipts and QR codes</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Multi-Tenant Support</h3>
                  <p className="text-sm text-gray-600">Support for multiple organizations and institutions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Building className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Easy Setup</h3>
                  <p className="text-sm text-gray-600">Quick organization creation and member invitation</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
            <p className="text-blue-100 mb-4">Create your organization or join an existing one to begin secure digital voting.</p>
                <Button 
              variant="secondary" 
                  className="w-full"
              onClick={() => setActiveTab('create')}
            >
              Create Organization
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;