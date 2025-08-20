import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Key, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'reset'>('email');

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
      setCurrentStep('reset');
      validateToken(resetToken);
    } else {
      setCurrentStep('email');
    }
  }, [searchParams]);

  const validateToken = async (resetToken: string) => {
    setIsValidatingToken(true);
    try {
      // In a real app, you would validate the token with your backend
      // For now, we'll simulate validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate token validation
      if (resetToken.length > 10) {
        setIsTokenValid(true);
      } else {
        setIsTokenValid(false);
        toast({
          title: "Invalid Reset Link",
          description: "The reset link is invalid or has expired. Please request a new one.",
          variant: "destructive"
        });
      }
    } catch (error) {
      setIsTokenValid(false);
      toast({
        title: "Token Validation Failed",
        description: "Unable to validate the reset link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Call the server endpoint to send the reset email
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      const response = await fetch(`${serverUrl}/api/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      setIsEmailSent(true);
      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions"
      });

    } catch (error) {
      console.error('Failed to send reset email:', error);
      toast({
        title: "Failed to Send",
        description: error instanceof Error ? error.message : "Unable to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setIsLoading(true);

      // Call the server endpoint to resend the reset email
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      const response = await fetch(`${serverUrl}/api/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions"
      });
    } catch (error) {
      console.error('Failed to resend reset email:', error);
      toast({
        title: "Failed to Send",
        description: error instanceof Error ? error.message : "Unable to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Bonus for mixed case and numbers
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
    
    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 1; // Common sequences
    
    // Ensure score is between 0 and 5
    score = Math.max(0, Math.min(score, 5));
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-emerald-500'];
    
    return {
      score: score,
      label: labels[score],
      color: colors[score]
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation 1: Check if password is empty
    if (!newPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }

    // Validation 2: Check password length
    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    // Validation 3: Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      toast({
        title: "Password Too Weak",
        description: "Password must contain uppercase, lowercase, number, and special character",
        variant: "destructive"
      });
      return;
    }

    // Validation 4: Check if confirm password is empty
    if (!confirmPassword.trim()) {
      toast({
        title: "Confirm Password Required",
        description: "Please confirm your new password",
        variant: "destructive"
      });
      return;
    }

    // Validation 5: Check if passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    // Validation 6: Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      toast({
        title: "Password Too Common",
        description: "Please choose a more unique password",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // In a real app, you would make an API call to reset the password
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      setPasswordResetSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been successfully reset"
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth');
      }, 3000);

    } catch (error) {
      console.error('Password reset failed:', error);
      toast({
        title: "Reset Failed",
        description: "Unable to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email step (when no token provided)
  if (currentStep === 'email') {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-[#6B21E8]/10 rounded-full flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-[#6B21E8]" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Reset Your Password</CardTitle>
              <CardDescription className="text-gray-600">
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!isEmailSent ? (
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>

                                <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength.score < 3}
              >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Reset Link...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">Reset Link Sent!</h3>
                    <p className="text-sm text-gray-600">
                      We've sent a password reset link to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-gray-500">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={handleResendEmail}
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Resending...
                        </>
                      ) : (
                        'Resend Email'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div className="mt-6 pt-4 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Token validation loading state
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="shadow-lg">
            <CardContent className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B21E8] mx-auto mb-4"></div>
              <p className="text-gray-600">Validating reset link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="shadow-lg">
            <CardContent className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Reset Link</h3>
              <p className="text-gray-600 mb-4">
                The reset link is invalid or has expired. Please request a new one.
              </p>
              <Button onClick={() => navigate('/reset-password')}>
                Request New Reset Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password reset success state
  if (passwordResetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="shadow-lg">
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Reset Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your password has been successfully reset. You will be redirected to login shortly.
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6B21E8] mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#6B21E8]/10 rounded-full flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-[#6B21E8]" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Set New Password</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your new password below
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                                  <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {/* Password strength indicator */}
                      {newPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Password strength:</span>
                            <span className={`font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <Progress value={(passwordStrength.score + 1) * 20} className="h-2" />
                          
                          {/* Password requirements checklist */}
                          <div className="space-y-1 text-xs">
                            <div className={`flex items-center space-x-2 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                              {newPassword.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>At least 8 characters</span>
                            </div>
                            <div className={`flex items-center space-x-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                              {/[A-Z]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>One uppercase letter</span>
                            </div>
                            <div className={`flex items-center space-x-2 ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                              {/[a-z]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>One lowercase letter</span>
                            </div>
                            <div className={`flex items-center space-x-2 ${/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                              {/\d/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>One number</span>
                            </div>
                            <div className={`flex items-center space-x-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                              {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>One special character</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                                  <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isLoading}
                          className={`pr-10 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : confirmPassword && newPassword === confirmPassword ? 'border-green-500' : ''}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      {/* Password match indicator */}
                      {confirmPassword && (
                        <div className="flex items-center space-x-2 text-sm">
                          {newPassword === confirmPassword ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Passwords match</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-red-600">Passwords don't match</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </>
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 pt-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 