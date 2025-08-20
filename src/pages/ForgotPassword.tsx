import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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

      // In a real app, you would make an API call to send the reset email
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      setIsEmailSent(true);
      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions"
      });

    } catch (error) {
      console.error('Failed to send reset email:', error);
      toast({
        title: "Failed to Send",
        description: "Unable to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsEmailSent(false);
    await handleSubmit(new Event('submit') as any);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {isEmailSent ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Mail className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <CardTitle>
              {isEmailSent ? 'Check Your Email' : 'Forgot Password'}
            </CardTitle>
            <CardDescription>
              {isEmailSent 
                ? `We've sent password reset instructions to ${email}`
                : 'Enter your email address to receive reset instructions'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!isEmailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isLoading}
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
                  <p className="text-sm text-gray-600">
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
              <Link to="/auth">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-2">Need Help?</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Make sure to check your spam or junk folder</p>
              <p>• Reset links expire after 24 hours</p>
              <p>• Contact your organization admin if you continue having issues</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 