import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Search, Loader2, X, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/database';

interface UserWithVerification extends UserProfile {
  followers_count: number;
  threads_count: number;
}

export function AdminVerificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserWithVerification[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<UserWithVerification[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { checkAccess(); }, []);

  const checkAccess = async () => {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      toast({ title: 'Access denied', variant: 'destructive' });
      navigate('/');
      return;
    }
    setHasAccess(true);
    loadVerifiedUsers();
    setLoading(false);
  };

  const loadVerifiedUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_verified', true)
      .order('verified_at', { ascending: false })
      .limit(50);

    if (error) { console.error(error); return; }

    const withStats = await Promise.all(
      (data || []).map(async (user) => {
        const [{ count: followers }, { count: threads }] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
          supabase.from('threads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        return { ...user, followers_count: followers || 0, threads_count: threads || 0 };
      })
    );
    setVerifiedUsers(withStats as UserWithVerification[]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);
      if (error) throw error;

      const withStats = await Promise.all(
        (data || []).map(async (user) => {
          const [{ count: followers }, { count: threads }] = await Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
            supabase.from('threads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          ]);
          return { ...user, followers_count: followers || 0, threads_count: threads || 0 };
        })
      );
      setResults(withStats as UserWithVerification[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleToggleVerification = async (user: UserWithVerification) => {
    setToggling(user.id);
    const newValue = !user.is_verified;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_verified: newValue,
          verified_at: newValue ? new Date().toISOString() : null,
        })
        .eq('id', user.id);
      if (error) throw error;

      toast({
        title: newValue ? `✓ ${user.username} verified` : `✗ Verification removed`,
        description: newValue ? 'Blue badge granted' : 'Badge revoked',
      });

      // Update local state
      setResults(prev => prev.map(u => u.id === user.id ? { ...u, is_verified: newValue } : u));
      setVerifiedUsers(prev =>
        newValue
          ? [...prev.filter(u => u.id !== user.id), { ...user, is_verified: true }]
          : prev.filter(u => u.id !== user.id)
      );
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const UserRow = ({ user }: { user: UserWithVerification }) => (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
        <AvatarFallback className="font-bold text-sm bg-gradient-to-br from-primary to-purple-600 text-white">
          {user.username?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{user.username}</span>
          {user.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          {user.followers_count >= 500 && !user.is_verified && (
            <span className="text-[9px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
              Auto-eligible
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
          <span>{user.followers_count.toLocaleString()} followers</span>
          <span>{user.threads_count.toLocaleString()} threads</span>
        </div>
      </div>
      <Button
        size="sm"
        variant={user.is_verified ? 'outline' : 'default'}
        className={`rounded-full h-8 px-3 text-xs font-semibold flex-shrink-0 gap-1.5 ${
          user.is_verified
            ? 'border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
            : ''
        }`}
        onClick={() => handleToggleVerification(user)}
        disabled={toggling === user.id}
      >
        {toggling === user.id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : user.is_verified ? (
          <><X className="h-3 w-3" />Revoke</>
        ) : (
          <><BadgeCheck className="h-3.5 w-3.5" />Verify</>
        )}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-bold text-base leading-none">Verification Panel</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{verifiedUsers.length} verified accounts</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28">
        {/* Search */}
        <div className="px-4 py-3 border-b border-border/60">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search by username or email…"
                className="pl-9 rounded-xl h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              className="rounded-xl h-9 px-4 text-sm"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {/* Auto-eligible note */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-green-500" />
            <span>Users with 500+ followers are auto-eligible for verification</span>
          </div>
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="border-b border-border/60">
            <div className="px-4 py-2 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Search Results ({results.length})</span>
            </div>
            <div className="divide-y divide-border/60">
              {results.map(user => <UserRow key={user.id} user={user} />)}
            </div>
          </div>
        )}

        {/* Verified users list */}
        <div>
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/60">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Currently Verified</span>
            <span className="ml-auto text-xs text-muted-foreground">{verifiedUsers.length} accounts</span>
          </div>

          {verifiedUsers.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Users className="h-10 w-10" />
              <p className="text-sm">No verified accounts yet</p>
              <p className="text-xs">Search for users above to grant verification badges</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {verifiedUsers.map(user => <UserRow key={user.id} user={user} />)}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
