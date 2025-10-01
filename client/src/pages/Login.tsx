import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  async function handleSendOTP() {
    if (!phone.trim()) {
      toast({
        title: 'Phone number required',
        description: 'Please enter your mobile number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast({
            title: 'Too many requests',
            description: `Please try again in ${data.retryAfter} seconds`,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || 'Failed to send OTP');
      }

      setRequestId(data.requestId);
      setStep('otp');
      setResendCountdown(45);
      toast({
        title: 'OTP sent!',
        description: 'Check your phone for the verification code',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) {
      toast({
        title: 'OTP required',
        description: 'Please enter the verification code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
        credentials: 'include',
      });

      const data = await res.json();
      console.log('OTP Verify Response:', { status: res.status, ok: res.ok, data });

      if (!res.ok || !data.success) {
        toast({
          title: 'Invalid OTP',
          description: data.error || 'The code you entered is incorrect',
          variant: 'destructive',
        });
        return;
      }

      console.log('OTP verification successful, redirecting to dashboard...');
      
      toast({
        title: 'Success!',
        description: 'You are now logged in',
      });

      // Use window.location for full page reload to ensure clean state
      window.location.href = '/';
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Verification failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setOtp('');
    setResendCountdown(45);
    await handleSendOTP();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">
            {step === 'phone' ? 'Welcome to VaktaAI' : 'Verify OTP'}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 'phone'
              ? 'Enter your mobile number to get started'
              : `Enter the verification code sent to ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
                />
                <p className="text-sm text-muted-foreground">
                  We'll send you a verification code via SMS
                </p>
              </div>
              <Button
                data-testid="button-send-otp"
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  data-testid="input-otp"
                  type="text"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  maxLength={10}
                />
              </div>
              <Button
                data-testid="button-verify-otp"
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </Button>
              <div className="text-center space-y-2">
                <button
                  data-testid="button-change-number"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change number
                </button>
                {resendCountdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in {resendCountdown}s
                  </p>
                ) : (
                  <button
                    data-testid="button-resend-otp"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
