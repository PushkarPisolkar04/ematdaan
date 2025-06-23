import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Timer } from "lucide-react";
import { registerUser, verifyRegistration } from '@/lib/api/auth';

const Register = () => {
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
    // Check if wallet is connected
    const address = localStorage.getItem('wallet_address');
    if (!address) {
      navigate('/login');
      return;
    }

    // Check if admin
    const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();
    if (adminAddress && address.toLowerCase() === adminAddress) {
      navigate('/admin');
      return;
    }
  }, [navigate]);

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

  const handleSendOTP = async () => {
    if (!formData.name || !formData.dob || !formData.email) {
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
      await verifyRegistration(formData.email, formData.otp);

      toast({
        title: "Registration Successful",
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
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                disabled={showOTP}
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                disabled={showOTP}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                disabled={showOTP}
              />
            </div>

            {showOTP ? (
              <>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={formData.otp}
                    onChange={(value) => setFormData(prev => ({ ...prev, otp: value }))}
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
                <div className="text-sm text-gray-500 flex items-center gap-1 mt-2">
                  <Timer className="h-4 w-4" />
                  <span>Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
                <Button
                  className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                  onClick={handleVerifyOTP}
                  disabled={isVerifying || formData.otp.length !== 6}
                >
                  {isVerifying ? "Verifying..." : "Verify OTP"}
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90"
                onClick={handleSendOTP}
                disabled={isSendingOTP || !formData.name || !formData.dob || !formData.email}
              >
                {isSendingOTP ? "Sending OTP..." : "Send OTP"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register; 