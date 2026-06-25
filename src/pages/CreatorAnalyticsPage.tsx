import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Repeat2,
  Users, Loader2, BarChart3, Flame, Star, ArrowUpRight, Calendar,
  DollarSign, CreditCard, TrendingDown, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Thread } from '@/types/database';
import { formatDistanceToNow, format } from 'date-fns';

type AnalyticsTab = 'overview' | 'revenue' | 'threads';

interface Stats {
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalThreads: number;
  followersCount: number;
  engagementRate: string;
  topThreads: (Thread & { engagement: number })[];
}

interface RevenueData {
  totalTips: number;
  totalSubscriptions: number;
  recentTips: any[];
  recentSubscriptions: any[];
  totalEarnings: number;
  paypalEmail: string | null;
}

export function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadAnalytics(), loadRevenue()]);
    setLoading(false);
  };

  const loadAnalytics = async () => {
    if (!user) return;
    try {
      const [
        { data: threads },
        { count: followersCount },
        { data: analytics },
      ] = await Promise.all([
        supabase
          .from('threads')
          .select('*, user:user_profiles(id, username, email, avatar_url)')
          .eq('user_id', user.id)
          .is('scheduled_at', null)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('profile_analytics').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (!threads) return;

      const threadIds = threads.map(t => t.id);
      const [{ data: likes }, { data: replies }, { data: reposts }] = await Promise.all([
        supabase.from('thread_likes').select('thread_id').in('thread_id', threadIds),
        supabase.from('thread_replies').select('thread_id').in('thread_id', threadIds),
        supabase.from('thread_reposts').select('thread_id').in('thread_id', threadIds),
      ]);

      const likesMap: Record<string, number> = {};
      const repliesMap: Record<string, number> = {};
      const repostsMap: Record<string, number> = {};
      (likes || []).forEach((l: any) => { likesMap[l.thread_id] = (likesMap[l.thread_id] || 0) + 1; });
      (replies || []).forEach((r: any) => { repliesMap[r.thread_id] = (repliesMap[r.thread_id] || 0) + 1; });
      (reposts || []).forEach((r: any) => { repostsMap[r.thread_id] = (repostsMap[r.thread_id] || 0) + 1; });

      const totalLikes = Object.values(likesMap).reduce((a, b) => a + b, 0);
      const totalReplies = Object.values(repliesMap).reduce((a, b) => a + b, 0);
      const totalReposts = Object.values(repostsMap).reduce((a, b) => a + b, 0);
      const totalViews = analytics?.profile_views || 0;
      const totalEngagement = totalLikes + totalReplies + totalReposts;
      const engagementRate = followersCount && threads.length > 0
        ? ((totalEngagement / (followersCount! * threads.length)) * 100).toFixed(1)
        : '0.0';

      const topThreads = threads
        .map(t => ({
          ...t,
          likes_count: likesMap[t.id] || 0,
          replies_count: repliesMap[t.id] || 0,
          reposts_count: repostsMap[t.id] || 0,
          engagement: (likesMap[t.id] || 0) + (repliesMap[t.id] || 0) * 2 + (repostsMap[t.id] || 0) * 3,
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 5);

      setStats({
        totalViews,
        totalLikes,
        totalReplies,
        totalReposts,
        totalThreads: threads.length,
        followersCount: followersCount || 0,
        engagementRate,
        topThreads,
      });
    } catch (e: any) {
      toast({ title: 'Error loading analytics', description: e.message, variant: 'destructive' });
    }
  };

  const loadRevenue = async () => {
    if (!user) return;
    try {
      const [
        { data: tips },
        { data: subscriptions },
        { data: creatorSettings },
      ] = await Promise.all([
        supabase
          .from('creator_tips')
          .select('*, sender:sender_id(id, username, email, avatar_url)')
          .eq('receiver_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('creator_subscriptions')
          .select('*, subscriber:subscriber_id(id, username, email, avatar_url)')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('creator_settings')
          .select('total_earnings, paypal_email')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const totalTips = (tips || []).reduce((sum: number, t: any) => sum + parseFloat(t.amount_usd || 0), 0);
      const totalSubscriptions = (subscriptions || []).reduce((sum: number, s: any) => sum + parseFloat(s.amount_usd || 0), 0);

      setRevenue({
        totalTips,
        totalSubscriptions,
        recentTips: tips || [],
        recentSubscriptions: subscriptions || [],
        totalEarnings: parseFloat(creatorSettings?.total_earnings || '0') || (totalTips + totalSubscriptions),
        paypalEmail: creatorSettings?.paypal_email || null,
      });
    } catch (e: any) {
      console.error('Revenue load error:', e);
    }
  };

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'threads', label: 'Top Threads' },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-base leading-none">Creator Dashboard</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">@{user?.username}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto flex border-b border-border/60 px-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-semibold relative transition-colors ${
                activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28 px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && stats && (
              <>
                {/* Hero card */}
                <div className="rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-blue-600 p-5 text-white mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12 border-2 border-white/30">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-white/20 text-white font-bold">
                        {user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-base">@{user?.username}</p>
                      <p className="text-white/70 text-xs">Creator Dashboard</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                      <Star className="h-3 w-3" />
                      <span className="text-xs font-semibold">{stats.engagementRate}% ER</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: stats.totalThreads, l: 'Threads' },
                      { v: stats.followersCount.toLocaleString(), l: 'Followers' },
                      { v: stats.totalViews.toLocaleString(), l: 'Views' },
                    ].map(({ v, l }) => (
                      <div key={l} className="bg-white/10 rounded-xl p-2.5 text-center">
                        <p className="text-xl font-bold">{v}</p>
                        <p className="text-[10px] text-white/70">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { icon: <Heart className="h-4.5 w-4.5 text-red-500" />, label: 'Total Likes', value: stats.totalLikes.toLocaleString(), bg: 'bg-red-500/8' },
                    { icon: <MessageCircle className="h-4.5 w-4.5 text-blue-500" />, label: 'Total Replies', value: stats.totalReplies.toLocaleString(), bg: 'bg-blue-500/8' },
                    { icon: <Repeat2 className="h-4.5 w-4.5 text-green-500" />, label: 'Total Reposts', value: stats.totalReposts.toLocaleString(), bg: 'bg-green-500/8' },
                    { icon: <TrendingUp className="h-4.5 w-4.5 text-purple-500" />, label: 'Engagement Rate', value: `${stats.engagementRate}%`, bg: 'bg-purple-500/8' },
                    { icon: <DollarSign className="h-4.5 w-4.5 text-amber-500" />, label: 'Total Earnings', value: `$${(revenue?.totalEarnings || 0).toFixed(2)}`, bg: 'bg-amber-500/8' },
                    { icon: <Flame className="h-4.5 w-4.5 text-orange-500" />, label: 'Total Engagement', value: (stats.totalLikes + stats.totalReplies + stats.totalReposts).toLocaleString(), bg: 'bg-orange-500/8' },
                  ].map((card, i) => (
                    <div key={i} className={`rounded-2xl border border-border/60 p-4 ${card.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        {card.icon}
                        <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xl font-bold">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                    </div>
                  ))}
                </div>

                {/* Growth tips */}
                <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Growth Tips
                  </h3>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {['Post 2–3 threads daily for maximum reach', 'Use hashtags and @mentions to boost discoverability', 'Engage with replies within the first hour', 'Videos get 3× more engagement than text', 'Use polls to drive conversations'].map(tip => (
                      <li key={tip} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* REVENUE TAB */}
            {activeTab === 'revenue' && (
              <>
                {/* Revenue summary */}
                <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-5 text-white mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-6 w-6" />
                    <h2 className="font-bold text-lg">Total Earnings</h2>
                  </div>
                  <p className="text-4xl font-black mb-1">
                    ${(revenue?.totalEarnings || 0).toFixed(2)}
                  </p>
                  <p className="text-white/70 text-xs">
                    {revenue?.paypalEmail
                      ? `PayPal: ${revenue.paypalEmail}`
                      : 'No PayPal email set — go to Monetization to configure'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/15 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Gift className="h-3.5 w-3.5" />
                        <span className="text-xs text-white/80">Tips</span>
                      </div>
                      <p className="text-xl font-bold">${(revenue?.totalTips || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white/15 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span className="text-xs text-white/80">Subscriptions</span>
                      </div>
                      <p className="text-xl font-bold">${(revenue?.totalSubscriptions || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Recent tips */}
                <div className="border border-border/60 rounded-2xl overflow-hidden mb-3">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-sm">Recent Tips</h3>
                  </div>
                  {(revenue?.recentTips || []).length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No tips yet</div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {(revenue?.recentTips || []).slice(0, 10).map((tip: any) => (
                        <div key={tip.id} className="flex items-center gap-3 px-4 py-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={tip.sender?.avatar_url} />
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                              {tip.sender?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-none">@{tip.sender?.username || 'Anonymous'}</p>
                            {tip.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">"{tip.message}"</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(tip.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <span className="font-bold text-green-600 dark:text-green-400 text-sm flex-shrink-0">
                            +${parseFloat(tip.amount_usd).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent subscriptions */}
                <div className="border border-border/60 rounded-2xl overflow-hidden mb-4">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-sm">Recent Subscriptions</h3>
                  </div>
                  {(revenue?.recentSubscriptions || []).length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No subscriptions yet</div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {(revenue?.recentSubscriptions || []).slice(0, 10).map((sub: any) => (
                        <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={sub.subscriber?.avatar_url} />
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                              {sub.subscriber?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-none">@{sub.subscriber?.username || 'Subscriber'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                sub.tier === 'vip' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                sub.tier === 'pro' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                              }`}>{sub.tier}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                sub.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-muted text-muted-foreground'
                              }`}>{sub.status}</span>
                            </div>
                          </div>
                          <span className="font-bold text-green-600 dark:text-green-400 text-sm flex-shrink-0">
                            +${parseFloat(sub.amount_usd).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Monetization CTA */}
                {!revenue?.paypalEmail && (
                  <Button
                    className="w-full rounded-xl gap-2"
                    onClick={() => navigate('/monetization')}
                  >
                    <DollarSign className="h-4 w-4" />
                    Set Up Monetization
                  </Button>
                )}
              </>
            )}

            {/* TOP THREADS TAB */}
            {activeTab === 'threads' && stats && (
              <div className="border border-border/60 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold text-sm">Top Performing Threads</h2>
                </div>
                {stats.topThreads.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">No threads yet</div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {stats.topThreads.map((thread, i) => (
                      <button
                        key={thread.id}
                        onClick={() => navigate(`/thread/${thread.id}`)}
                        className="w-full text-left px-4 py-3.5 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                            i === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                            i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2 mb-1.5">{thread.content}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" />{thread.likes_count}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-blue-400" />{thread.replies_count}</span>
                              <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3 text-green-400" />{thread.reposts_count}</span>
                              <span className="ml-auto text-[10px] flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
