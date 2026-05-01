import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

type AuthStep = 'entry' | 'otp' | 'register-complete';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<AuthStep>('entry');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuthStore();

  const handleSendOtp = async () => {
    if (!email.trim()) { toast({ title: 'Email required', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await authService.sendOtp(email);
      setStep('otp');
      toast({ title: 'Check your email', description: 'We sent a 4-digit code to your email.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!username.trim()) { toast({ title: 'Username required', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(email, otp, password, username);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const user = await authService.signInWithPassword(email, password);
      login(authService.mapUser(user));
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const resetToEntry = () => { setStep('entry'); setOtp(''); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl items-center justify-center shadow-2xl mb-4">
            <span className="text-3xl font-black text-white">T</span>
          </div>
          <h1 className="text-2xl font-bold">ThreadsClone</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect, share, discover</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode('login'); setStep('entry'); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'login' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setStep('entry'); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'register' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {mode === 'login' ? (
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12"
              autoComplete="email"
            />
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 pr-10"
                autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={handleLogin}
              disabled={!email || !password || loading}
              className="w-full h-12 rounded-xl font-semibold text-base"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {step === 'entry' && (
              <>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  autoComplete="email"
                />
                <Input
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  disabled={loading}
                  className="h-12"
                  maxLength={30}
                />
                <Button
                  onClick={handleSendOtp}
                  disabled={!email || !username || loading}
                  className="w-full h-12 rounded-xl font-semibold text-base"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
                </Button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="text-center mb-2">
                  <p className="text-sm text-muted-foreground">
                    Enter the 4-digit code sent to <strong>{email}</strong>
                  </p>
                </div>
                <Input
                  placeholder="Enter OTP code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  className="h-12 text-center text-xl font-bold tracking-widest"
                  inputMode="numeric"
                  maxLength={6}
                />
                <Input
                  placeholder="Username"
                  value={username}
                  disabled
                  className="h-12 bg-muted/50"
                />
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 pr-10"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  onClick={handleRegister}
                  disabled={!otp || !password || loading}
                  className="w-full h-12 rounded-xl font-semibold text-base"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <><Sparkles className="h-4 w-4 mr-2" />Create Account</>
                  )}
                </Button>
                <button onClick={resetToEntry} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
