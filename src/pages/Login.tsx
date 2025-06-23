import { useState, useEffect } from "react";
import { Wallet, Mail, Key, User, Calendar, CheckCircle, AlertCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { connectMetaMask, checkConnection } from "@/lib/metamask";
import { isUserAdmin } from '@/lib/supabase';
import { registerUser, verifyRegistration, loginUser, verifyLogin } from '@/lib/api/auth';
import { supabase } from '@/lib/supabase';

const Login = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    email: "",
    otp: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkMetaMask = async () => {
      const connected = await checkConnection();
      setIsConnected(connected);

      if (connected) {
        const address = localStorage.getItem('wallet_address');
        if (address) {
          // Check if admin wallet
          const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
          if (adminAddress && address.toLowerCase() === adminAddress.toLowerCase()) {
            navigate('/admin');
            toast({
              title: "Admin Wallet Connected",
              description: "Please proceed with admin login",
            });
            return;
          }

          // Check if user exists in database
          const { data: existingUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('address', address.toLowerCase())
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // User not found
              setIsNewUser(true);
              toast({
                title: "Welcome",
                description: "Please complete registration to continue",
              });
            } else {
              throw error;
            }
          } else {
            // User found - autofill email
            setIsNewUser(false);
            setFormData(prev => ({ ...prev, email: existingUser.email }));
            toast({
              title: "Welcome Back",
              description: "Please verify your email to continue",
            });
          }
        }
      }
    };

    checkMetaMask();
  }, [toast, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && showOTP) {
      toast({
        title: "OTP Expired",
        description: "Please request a new OTP",
        variant: "destructive"
      });
      setShowOTP(false);
    }
    return () => clearInterval(timer);
  }, [timeLeft, showOTP, toast]);

  const handleConnectWallet = async () => {
    try {
      const { address } = await connectMetaMask();
      setIsConnected(true);

      // Check if the address is admin
      const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS;
      if (adminAddress && address.toLowerCase() === adminAddress.toLowerCase()) {
        // Admin user - redirect to admin page
        navigate('/admin');
        toast({
          title: "Admin Wallet Connected",
          description: "Please proceed with admin login",
        });
        return;
      }

      // Regular user - check if they exist in database
      const { data: existingUser, error } = await supabase
        .from('users')
        .select()
        .eq('address', address.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found
          setIsNewUser(true);
          toast({
            title: "Welcome",
            description: "Please complete registration to continue",
          });
        } else {
          throw error;
        }
      } else {
        // User found - autofill email
        setIsNewUser(false);
        setFormData(prev => ({ ...prev, email: existingUser.email }));
        toast({
          title: "Welcome Back",
          description: "Please verify your email to continue",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Please make sure MetaMask is installed",
        variant: "destructive"
      });
    }
  };

  const handleSendOTP = async () => {
    if (isNewUser && (!formData.name || !formData.dob || !formData.email)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSendingOTP(true);
    try {
      const address = localStorage.getItem('wallet_address');
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (isNewUser) {
        // Register new user
        const { otpSent } = await registerUser(
          address,
          formData.email,
          formData.name,
          formData.dob
        );

        if (otpSent) {
          setTimeLeft(300); // 5 minutes in seconds
          setShowOTP(true);
          toast({
            title: "OTP Sent",
            description: "Please check your email for the verification code",
          });
        }
      } else {
        // Login existing user
        const { otpSent } = await loginUser(formData.email);
        if (otpSent) {
          setTimeLeft(300); // 5 minutes in seconds
          setShowOTP(true);
          toast({
            title: "OTP Sent",
            description: "Please check your email for the verification code",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Failed to Send OTP",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      setShowOTP(false);
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (formData.otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    if (timeLeft === 0) {
      toast({
        title: "OTP Expired",
        description: "Please request a new OTP",
        variant: "destructive"
      });
      setShowOTP(false);
      return;
    }

    setIsVerifying(true);
    
    try {
      const user = isNewUser 
        ? await verifyRegistration(formData.email, formData.otp)
        : await verifyLogin(formData.email, formData.otp);

      toast({
        title: "Verification Successful",
        description: "Redirecting to dashboard...",
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid OTP",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            Secure Login
          </CardTitle>
          <p className="text-muted-foreground">Connect your wallet to access the voting system</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!isConnected ? (
            <Button onClick={handleConnectWallet} className="w-full bg-saffron hover:bg-saffron/90">
              Connect MetaMask
            </Button>
          ) : !showOTP ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Wallet Connected</span>
              </div>
              
              {isNewUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      disabled={isSendingOTP}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      disabled={isSendingOTP}
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!isNewUser || isSendingOTP}
                  readOnly={!isNewUser}
                />
              </div>
              
              <Button 
                onClick={handleSendOTP} 
                className="w-full"
                disabled={isSendingOTP}
              >
                {isSendingOTP ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send OTP
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Enter Verification Code</h3>
                <p className="text-sm text-muted-foreground">
                  Code sent to {formData.email}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={formData.otp}
                  onChange={(value) => setFormData({...formData, otp: value})}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleVerifyOTP} 
                  className="w-full"
                  disabled={isVerifying || timeLeft === 0}
                >
                  {isVerifying ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verify & Continue
                    </>
                  )}
                </Button>
                
                {timeLeft === 0 && (
                  <Button 
                    onClick={handleSendOTP} 
                    variant="outline" 
                    className="w-full"
                    disabled={isSendingOTP}
                  >
                    {isSendingOTP ? (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                        Resending OTP...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend OTP
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
