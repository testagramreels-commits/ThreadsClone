import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Crown, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Thread, UserProfile } from '@/types/database';

interface ExclusivePost {
  thread: Thread;
  creator: UserProfile;
  required_tier: string;
  preview_text?: string;
  is_unlocked: boolean;
}

export function ExclusiveFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ExclusivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => { loadExclusivePosts(); }, [user]);

  const loadExclusivePosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get exclusive posts metadata
      const { data: exclusiveMeta, error: metaErr } = await supabase
        .from('exclusive_posts')
        .select('*, thread:threads(*, user:user_profiles(id, username, email, avatar_url, is_verified))')
        .order('created_at', { ascending: false })
        .limit(50);

      if (metaErr) throw metaErr;
      if (!exclusiveMeta) { setLoading(false); return; }

      // Get user's active subscriptions to know which are unlocked
      const { data: subscriptions } = await supabase
        .from('creator_subscriptions')
        .select('creator_id, tier, status')
        .eq('subscriber_id', user.id)
        .eq('status', 'active');

      const subscribedCreators = new Set(
        (subscriptions || []).map((s: any) => s.creator_id)
      );

      // Fetch like/repost counts for threads
      const threadIds = exclusiveMeta.map((e: any) => e.thread_id);
      const [{ data: likes }, { data: replies }, { data: reposts }] = await Promise.all([
        threadIds.length > 0
          ? supabase.from('thread_likes').select('thread_id').in('thread_id', threadIds)
          : Promise.resolve({ data: [] }),
        threadIds.length > 0
          ? supabase.from('thread_replies').select('thread_id').in('thread_id', threadIds)
          : Promise.resolve({ data: [] }),
        threadIds.length > 0
          ? supabase.from('thread_reposts').select('thread_id').in('thread_id', threadIds)
          : Promise.resolve({ data: [] }),
      ]);

      const likeMap: Record<string, number> = {};
      const replyMap: Record<string, number> = {};
      const repostMap: Record<string, number> = {};
      (likes || []).forEach((l: any) => likeMap[l.thread_id] = (likeMap[l.thread_id] || 0) + 1);
      (replies || []).forEach((r: any) => replyMap[r.thread_id] = (replyMap[r.thread_id] || 0) + 1);
      (reposts || []).forEach((r: any) => repostMap[r.thread_id] = (repostMap[r.thread_id] || 0) + 1);

      const processed: ExclusivePost[] = exclusiveMeta
        .filter((e: any) => e.thread)
        .map((e: any) => {
          const isOwn = e.creator_id === user.id;
          const isSubscriber = subscribedCreators.has(e.creator_id);
          const isUnlocked = isOwn || isSubscriber;

          return {
            thread: {
              ...e.thread,
              likes_count: likeMap[e.thread_id] || 0,
              replies_count: replyMap[e.thread_id] || 0,
              reposts_count: repostMap[e.thread_id] || 0,
              is_exclusive: true,
            } as Thread,
            creator: e.thread.user as UserProfile,
            required_tier: e.required_tier,
            preview_text: e.preview_text,
            is_unlocked: isUnlocked,
          };
        });

      setPosts(processed);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (activeFilter === 'unlocked') return p.is_unlocked;
    if (activeFilter === 'locked') return !p.is_unlocked;
    return true;
  });

  const unlockedCount = posts.filter(p => p.is_unlocked).length;
  const lockedCount = posts.filter(p => !p.is_unlocked).length;

  const TierBadge = ({ tier }: { tier: string }) => {
    const colors: Record<string, string> = {
      basic: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
      pro: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
      vip: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    };
    return (
      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${colors[tier] || colors.basic}`}>
        {tier}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <div>
              <h1 className="font-bold text-base leading-none">Exclusive Feed</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Subscriber-only content</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="max-w-2xl mx-auto flex border-b border-border/60 px-4">
          {([
            { key: 'all', label: `All (${posts.length})` },
            { key: 'unlocked', label: `Unlocked (${unlockedCount})` },
            { key: 'locked', label: `Locked (${lockedCount})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2.5 text-xs font-semibold relative transition-colors ${
                activeFilter === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeFilter === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              {activeFilter === 'locked' ? (
                <Lock className="h-10 w-10 text-muted-foreground" />
              ) : (
                <Sparkles className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-bold text-lg">
                {activeFilter === 'locked' ? 'No locked content' :
                 activeFilter === 'unlocked' ? 'No unlocked content yet' :
                 'No exclusive posts yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilter === 'locked'
                  ? 'You have access to all exclusive content from creators you follow.'
                  : 'Subscribe to creators to unlock their exclusive posts.'}
              </p>
            </div>
            {activeFilter !== 'locked' && (
              <Button variant="outline" className="rounded-full" onClick={() => navigate('/leaderboard')}>
                Discover Creators
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredPosts.map(({ thread, creator, required_tier, preview_text, is_unlocked }) => (
              <div key={thread.id}>
                {is_unlocked ? (
                  // Full content for subscribers / owner
                  <ThreadCard thread={thread} onUpdate={loadExclusivePosts} />
                ) : (
                  // Blurred preview for non-subscribers
                  <div className="p-4">
                    <div className="flex gap-3 mb-3">
                      <Avatar
                        className="h-10 w-10 flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/profile/${creator.username}`)}
                      >
                        <AvatarImage src={creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`} />
                        <AvatarFallback className="font-bold text-sm bg-gradient-to-br from-primary to-purple-600 text-white">
                          {creator.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-semibold text-sm cursor-pointer hover:underline"
                            onClick={() => navigate(`/profile/${creator.username}`)}
                          >
                            {creator.username}
                          </span>
                          <TierBadge tier={required_tier} />
                        </div>
                        {/* Blurred preview text */}
                        <div className="relative">
                          <p className="text-sm text-muted-foreground line-clamp-2 select-none">
                            {preview_text || 'Exclusive content for subscribers only...'}
                          </p>
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
                        </div>
                      </div>
                    </div>

                    {/* Lock overlay */}
                    <div className="border border-border/60 rounded-2xl p-5 bg-muted/30 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {required_tier.charAt(0).toUpperCase() + required_tier.slice(1)} subscribers only
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Subscribe to @{creator.username} to unlock this post
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full px-5 gap-1.5 h-8 text-xs font-semibold"
                        onClick={() => navigate(`/profile/${creator.username}`)}
                      >
                        <Crown className="h-3.5 w-3.5" />
                        Subscribe
                      </Button>
                    </div>
                  </div>
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
