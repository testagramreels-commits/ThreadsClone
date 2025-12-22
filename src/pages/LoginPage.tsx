import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuthStore();

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await authService.sendOtp(email);
      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: 'Check your email for the verification code.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(email, otp, password, username);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const user = await authService.signInWithPassword(email, password);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AtSign className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Welcome to Threads</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={otpSent || loading}
            />
          </div>

          {!isLogin && !otpSent && (
            <div className="space-y-2">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {!isLogin && otpSent && (
            <div className="space-y-2">
              <Input
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {isLogin ? (
            <Button
              onClick={handleLogin}
              disabled={!email || !password || loading}
              className="w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          ) : (
            <>
              {!otpSent ? (
                <Button
                  onClick={handleSendOtp}
                  disabled={!email || !username || loading}
                  className="w-full"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              ) : (
                <Button
                  onClick={handleRegister}
                  disabled={!email || !otp || !password || loading}
                  className="w-full"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              )}
            </>
          )}

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin);
                setOtpSent(false);
                setOtp('');
              }}
              disabled={loading}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
