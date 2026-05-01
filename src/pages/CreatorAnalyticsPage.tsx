import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Repeat2,
  Users, Loader2, BarChart3, Flame, Star, ArrowUpRight, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Thread } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

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

export function CreatorAnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', user.username)
        .maybeSingle();
      if (!profile) return;

      const [
        { data: threads },
        { count: followersCount },
        { data: analytics },
      ] = await Promise.all([
        supabase
          .from('threads')
          .select('*, user:user_profiles(id, username, email, avatar_url)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profile.id),
        supabase
          .from('profile_analytics')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle(),
      ]);

      if (!threads) return;

      // Get counts for all threads at once
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
      const totalThreads = threads.length;

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
        totalThreads,
        followersCount: followersCount || 0,
        engagementRate,
        topThreads,
      });
    } catch (e: any) {
      toast({ title: 'Error loading analytics', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { icon: <Eye className="h-5 w-5 text-blue-500" />, label: 'Profile Views', value: stats.totalViews.toLocaleString(), color: 'bg-blue-500/10' },
    { icon: <Heart className="h-5 w-5 text-red-500" />, label: 'Total Likes', value: stats.totalLikes.toLocaleString(), color: 'bg-red-500/10' },
    { icon: <MessageCircle className="h-5 w-5 text-green-500" />, label: 'Total Replies', value: stats.totalReplies.toLocaleString(), color: 'bg-green-500/10' },
    { icon: <Repeat2 className="h-5 w-5 text-purple-500" />, label: 'Total Reposts', value: stats.totalReposts.toLocaleString(), color: 'bg-purple-500/10' },
    { icon: <Users className="h-5 w-5 text-orange-500" />, label: 'Followers', value: stats.followersCount.toLocaleString(), color: 'bg-orange-500/10' },
    { icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, label: 'Engagement Rate', value: `${stats.engagementRate}%`, color: 'bg-emerald-500/10' },
    { icon: <BarChart3 className="h-5 w-5 text-indigo-500" />, label: 'Total Threads', value: stats.totalThreads.toLocaleString(), color: 'bg-indigo-500/10' },
    { icon: <Flame className="h-5 w-5 text-amber-500" />, label: 'Total Engagement', value: (stats.totalLikes + stats.totalReplies + stats.totalReposts).toLocaleString(), color: 'bg-amber-500/10' },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-base">Creator Analytics</h1>
            <p className="text-xs text-muted-foreground">@{user?.username}</p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary card */}
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary via-purple-600 to-blue-600 p-5 text-white mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12 border-2 border-white/30">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white font-bold">
                    {user?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">@{user?.username}</p>
                  <p className="text-white/70 text-sm">Creator Dashboard</p>
                </div>
                <div className="ml-auto flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                  <Star className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{stats?.engagementRate}% ER</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats?.totalThreads}</p>
                  <p className="text-xs text-white/70">Threads</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats?.followersCount.toLocaleString()}</p>
                  <p className="text-xs text-white/70">Followers</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats?.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-white/70">Views</p>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {statCards.map((card, i) => (
                <div key={i} className={`rounded-2xl border border-border/60 p-4 ${card.color} bg-opacity-50`}>
                  <div className="flex items-center justify-between mb-2">
                    {card.icon}
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Top performing threads */}
            <div className="border border-border/60 rounded-2xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                <h2 className="font-semibold text-sm">Top Performing Threads</h2>
              </div>
              {stats?.topThreads.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No threads yet</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {stats?.topThreads.map((thread, i) => (
                    <button
                      key={thread.id}
                      onClick={() => navigate(`/thread/${thread.id}`)}
                      className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-slate-100 text-slate-700' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2 mb-1">{thread.content}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{thread.likes_count}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{thread.replies_count}</span>
                            <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" />{thread.reposts_count}</span>
                            <span className="flex items-center gap-1 ml-auto">
                              <Calendar className="h-3 w-3" />
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

            {/* Tips */}
            <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Growth Tips
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Post consistently — 2-3 threads per day maximizes reach</li>
                <li>• Use hashtags and @mentions to boost discoverability</li>
                <li>• Engage with replies within the first hour</li>
                <li>• Video content gets 3x more engagement than text</li>
                <li>• Use polls to drive conversations</li>
              </ul>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
