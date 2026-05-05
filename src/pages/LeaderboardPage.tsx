import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Trophy, Medal, TrendingUp, Users, Heart, Loader2, BadgeCheck, DollarSign, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { supabase } from '@/lib/supabase';
import { toggleFollow } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  followers_count: number;
  threads_count: number;
  total_likes: number;
  total_earnings: number;
  is_monetized: boolean;
  is_following?: boolean;
}

type LeaderboardTab = 'followers' | 'engagement' | 'creators';

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<LeaderboardTab>('followers');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => { loadLeaderboard(); }, [tab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Get all user profiles with stats
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url, bio, is_verified')
        .limit(100);

      if (!profiles) return;

      const withStats = await Promise.all(profiles.map(async (p) => {
        const [followersRes, threadsRes, likesRes, creatorRes] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id),
          supabase.from('threads').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
          supabase.from('thread_likes').select('*', { count: 'exact', head: true }).in('thread_id',
            (await supabase.from('threads').select('id').eq('user_id', p.id)).data?.map(t => t.id) || []
          ),
          supabase.from('creator_settings').select('is_monetized, total_earnings').eq('user_id', p.id).maybeSingle(),
        ]);

        return {
          ...p,
          is_verified: p.is_verified || false,
          followers_count: followersRes.count || 0,
          threads_count: threadsRes.count || 0,
          total_likes: likesRes.count || 0,
          is_monetized: creatorRes.data?.is_monetized || false,
          total_earnings: Number(creatorRes.data?.total_earnings || 0),
        } as LeaderboardEntry;
      }));

      // Sort based on tab
      let sorted = withStats;
      if (tab === 'followers') sorted = [...withStats].sort((a, b) => b.followers_count - a.followers_count);
      else if (tab === 'engagement') sorted = [...withStats].sort((a, b) => (b.total_likes + b.threads_count * 2) - (a.total_likes + a.threads_count * 2));
      else if (tab === 'creators') sorted = [...withStats].filter(u => u.is_monetized).sort((a, b) => b.total_earnings - a.total_earnings);

      setLeaders(sorted.slice(0, 50));

      // Check following status
      if (user) {
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        const map: Record<string, boolean> = {};
        follows?.forEach(f => { map[f.following_id] = true; });
        setFollowingMap(map);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFollow = async (userId: string, username: string) => {
    try {
      const followed = await toggleFollow(userId);
      setFollowingMap(prev => ({ ...prev, [userId]: followed }));
      toast({ title: followed ? `Following @${username}` : `Unfollowed @${username}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-amber-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800';
    if (index === 1) return 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 border-slate-200 dark:border-slate-700';
    if (index === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800';
    return '';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Creator Leaderboard
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border/60">
          {(['followers', 'engagement', 'creators'] as LeaderboardTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all relative ${
                tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'followers' ? '👥 Followers' : t === 'engagement' ? '🔥 Engagement' : '💰 Earners'}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-24 px-4 pt-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-4 mb-5 text-white flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
            {tab === 'followers' ? <Users className="h-6 w-6" /> : tab === 'engagement' ? <Heart className="h-6 w-6" /> : <DollarSign className="h-6 w-6" />}
          </div>
          <div>
            <p className="font-bold text-base">
              {tab === 'followers' ? 'Top by Followers' : tab === 'engagement' ? 'Most Engaging' : 'Top Earners'}
            </p>
            <p className="text-xs text-white/70">Updated in real-time · {leaders.length} creators ranked</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border animate-pulse">
                <div className="h-5 w-5 bg-muted rounded" />
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
                <div className="h-7 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No creators yet in this category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaders.map((leader, index) => (
              <div
                key={leader.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:shadow-sm ${getRankBg(index)}`}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-6">
                  {getRankIcon(index)}
                </div>

                <button
                  onClick={() => navigate(`/profile/${leader.username}`)}
                  className="flex-shrink-0"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-background">
                    <AvatarImage src={leader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`} />
                    <AvatarFallback className="font-bold text-sm bg-gradient-to-br from-primary to-purple-600 text-white">
                      {leader.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>

                <button
                  onClick={() => navigate(`/profile/${leader.username}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm truncate">@{leader.username}</span>
                    {leader.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    {leader.is_monetized && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded-full font-bold">PRO</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tab === 'followers' ? `${leader.followers_count.toLocaleString()} followers` :
                     tab === 'engagement' ? `${leader.total_likes.toLocaleString()} likes · ${leader.threads_count} posts` :
                     `$${leader.total_earnings.toFixed(2)} earned`}
                  </p>
                </button>

                {user && user.id !== leader.id && (
                  <Button
                    variant={followingMap[leader.id] ? 'outline' : 'default'}
                    size="sm"
                    className="rounded-full text-xs h-7 px-3 flex-shrink-0"
                    onClick={() => handleFollow(leader.id, leader.username)}
                  >
                    {followingMap[leader.id] ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
