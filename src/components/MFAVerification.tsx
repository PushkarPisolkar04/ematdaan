import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Mail, Clock, AlertCircle } from 'lucide-react';
import { generateMFAToken, verifyMFAToken } from '@/lib/advancedSecurity';
import { useToast } from '@/hooks/use-toast';
import { useMFARateLimit } from '@/hooks/useRateLimit';
import { logMFAAttempt } from '@/lib/securityAudit';

interface MFAVerificationProps {
  userId: string;
  action: string;
  onVerified: () => void;
  onCancel: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({
  userId,
  action,
  onVerified,
  onCancel
}) => {
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [mfaToken, setMfaToken] = useState<{ token: string; expires_at: string; action: string } | null>(null);
  const { toast } = useToast();
  const mfaRateLimit = useMFARateLimit(userId);

  useEffect(() => {
    // Send MFA token when component mounts
    sendMFAToken();
  }, []);

  useEffect(() => {
    // Countdown timer
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendMFAToken = async () => {
    // Check rate limit before sending
    const allowed = await mfaRateLimit.checkRateLimit();
    if (!allowed) {
      return; // Rate limit toast is shown by the hook
    }

    setSending(true);
    try {
      const token = await generateMFAToken(userId, action);
      setMfaToken(token);
      setTimeLeft(300); // Reset timer
      toast({
        title: "Verification Code Sent",
        description: "Check your email for the 6-digit verification code",
      });
    } catch (error) {
      toast({
        title: "Failed to Send Code",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyMFAToken(userId, mfaCode, action);
      
      if (isValid) {
        // Log successful MFA
        logMFAAttempt(userId, action, true);
        
        toast({
          title: "Verification Successful",
          description: "You can now proceed with the action",
        });
        onVerified();
      } else {
        // Log failed MFA
        logMFAAttempt(userId, action, false, "Invalid or expired verification code");
        
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or expired",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Multi-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code sent to your email to proceed with: <strong>{action}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Expires in {formatTime(timeLeft)}</span>
            </div>
            {timeLeft === 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Code expired</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleVerify}
              disabled={loading || !mfaCode || mfaCode.length !== 6 || timeLeft === 0}
              className="flex-1"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Verify & Proceed
            </Button>

            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendMFAToken}
              disabled={sending || timeLeft > 240 || mfaRateLimit.isRateLimited} // Can resend after 1 minute or if rate limited
              className="text-blue-600"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                  Sending...
                </>
              ) : mfaRateLimit.isRateLimited ? (
                <>
                  <AlertCircle className="h-3 w-3 mr-2" />
                  Rate Limited
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3 mr-2" />
                  Resend Code ({mfaRateLimit.remainingAttempts} left)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAVerification; 