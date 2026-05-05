import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThreadCard } from '@/components/features/ThreadCard';
import { BottomNav } from '@/components/features/BottomNav';
import { supabase } from '@/lib/supabase';
import { Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

function ThreadSkeleton() {
  return (
    <div className="p-4 border-b border-border/60 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-28 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const cleanTag = tag ? (tag.startsWith('#') ? tag.slice(1) : tag) : '';

  const fetchThreads = useCallback(async (currentOffset: number, append = false) => {
    if (!cleanTag) return;
    try {
      const { data, error, count } = await supabase
        .from('threads')
        .select(`
          *,
          user:user_profiles(id, username, email, avatar_url, is_verified)
        `, { count: 'exact' })
        .ilike('content', `%#${cleanTag}%`)
        .is('scheduled_at', null)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (error) throw error;

      const { data: { user: authUser } } = await supabase.auth.getUser();

      const withStats = await Promise.all((data || []).map(async (thread) => {
        const [likesRes, repliesRes, repostsRes] = await Promise.all([
          supabase.from('thread_likes').select('*', { count: 'exact', head: true }).eq('thread_id', thread.id),
          supabase.from('thread_replies').select('*', { count: 'exact', head: true }).eq('thread_id', thread.id),
          supabase.from('thread_reposts').select('*', { count: 'exact', head: true }).eq('thread_id', thread.id),
        ]);
        let isLiked = false;
        if (authUser) {
          const { data: like } = await supabase.from('thread_likes').select('id').eq('thread_id', thread.id).eq('user_id', authUser.id).maybeSingle();
          isLiked = !!like;
        }
        return {
          ...thread,
          likes_count: likesRes.count || 0,
          replies_count: repliesRes.count || 0,
          reposts_count: repostsRes.count || 0,
          is_liked: isLiked,
          is_reposted: false,
        };
      }));

      if (count !== null) setTotalCount(count);
      setHasMore((data || []).length === PAGE_SIZE);
      setThreads(prev => append ? [...prev, ...withStats] : withStats as Thread[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }, [cleanTag, toast]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    fetchThreads(0, false).finally(() => setLoading(false));
  }, [cleanTag]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = offset + PAGE_SIZE;
    await fetchThreads(next, true);
    setOffset(next);
    setLoadingMore(false);
  }, [loadingMore, hasMore, offset, fetchThreads]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1, rootMargin: '300px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base flex items-center gap-1.5">
              <Hash className="h-4 w-4 text-primary" />
              {cleanTag}
            </h1>
            {!loading && (
              <p className="text-xs text-muted-foreground">{totalCount.toLocaleString()} threads</p>
            )}
          </div>
        </div>
      </div>

      {/* Header card */}
      <div className="max-w-2xl mx-auto">
        <div className="mx-4 mt-4 mb-2 bg-gradient-to-br from-primary/10 via-purple-500/5 to-blue-500/10 border border-border/60 rounded-2xl p-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
            <Hash className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black">#{cleanTag}</h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{loading ? '...' : `${totalCount.toLocaleString()} threads`}</span>
            </div>
          </div>
        </div>

        <div className="pb-24">
          {loading ? (
            <div>{[...Array(5)].map((_, i) => <ThreadSkeleton key={i} />)}</div>
          ) : threads.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No threads for #{cleanTag}</p>
              <p className="text-sm mt-1">Be the first to use this hashtag!</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/60">
                {threads.map(thread => (
                  <ThreadCard key={thread.id} thread={thread} onUpdate={() => fetchThreads(0, false)} />
                ))}
              </div>
              <div ref={sentinelRef} className="py-6 flex justify-center">
                {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                {!hasMore && threads.length > 0 && (
                  <p className="text-xs text-muted-foreground">All threads loaded · #{cleanTag}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
