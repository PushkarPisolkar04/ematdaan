import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Key, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
      validateToken(resetToken);
    } else {
      setIsValidatingToken(false);
      setIsTokenValid(false);
      toast({
        title: "Invalid Reset Link",
        description: "No reset token provided. Please check your email link.",
        variant: "destructive"
      });
    }
  }, [searchParams]);

  const validateToken = async (resetToken: string) => {
    try {
      setIsValidatingToken(true);

      // In a real app, you would validate the token against your database
      // For now, we'll simulate token validation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate token validation - accept any token for demo
      if (resetToken && resetToken.length > 10) {
        setIsTokenValid(true);
      } else {
        setIsTokenValid(false);
        toast({
          title: "Invalid Token",
          description: "The reset token is invalid or has expired.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      setIsTokenValid(false);
      toast({
        title: "Validation Failed",
        description: "Unable to validate reset token. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;

    if (score <= 25) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 50) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 75) return { score, label: 'Good', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a new password",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical",
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

  // Token validation loading state
  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Validating Reset Token</h2>
                <p className="text-gray-600">Please wait while we validate your reset link...</p>
              </div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Invalid Reset Link</CardTitle>
            <CardDescription>
              This reset link is invalid or has expired. Please request a new password reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/forgot-password')} 
              className="w-full"
            >
              Request New Reset Link
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (passwordResetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Password Reset Successful</CardTitle>
            <CardDescription>
              Your password has been successfully reset. You can now log in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Redirecting to login page in 3 seconds...
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
          <p className="text-gray-600">
            Enter your new password below
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Create a strong password for your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter your new password"
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

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Password Strength:</span>
                      <span className={`font-medium ${
                        passwordStrength.score <= 25 ? 'text-red-600' :
                        passwordStrength.score <= 50 ? 'text-orange-600' :
                        passwordStrength.score <= 75 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <Progress value={passwordStrength.score} className="h-2" />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
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

                {/* Password Match Indicator */}
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
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
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

            {/* Password Requirements */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center space-x-2">
                  {newPassword.length >= 6 ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span>At least 6 characters long</span>
                </li>
                <li className="flex items-center space-x-2">
                  {/[A-Z]/.test(newPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span>Contains uppercase letter</span>
                </li>
                <li className="flex items-center space-x-2">
                  {/[0-9]/.test(newPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span>Contains number</span>
                </li>
                <li className="flex items-center space-x-2">
                  {/[^A-Za-z0-9]/.test(newPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-gray-400" />
                  )}
                  <span>Contains special character</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 