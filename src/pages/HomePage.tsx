import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { CreateThread } from '@/components/features/CreateThread';
import { ThreadCard } from '@/components/features/ThreadCard';
import { SuggestedContent } from '@/components/features/SuggestedContent';
import { AdSlot } from '@/components/features/AdSlot';
import { BottomNav } from '@/components/features/BottomNav';
import { StoriesBar } from '@/components/features/StoriesBar';
import { getMixedFeed, getThreadsOptimized } from '@/lib/optimizedApi';
import { getSuggestedUsers, getTrendingThreads, getMentionThreads, getVideoFeed } from '@/lib/api';
import { Thread, UserWithStats } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Video, TrendingUp, Users, Sparkles, AtSign, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

type FeedTab = 'latest' | 'trending' | 'following' | 'mentions' | 'videos';

const TABS = [
  { key: 'latest', label: 'For You', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: 'trending', label: 'Trending', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: 'following', label: 'Following', icon: <Users className="h-3.5 w-3.5" /> },
  { key: 'videos', label: 'Videos', icon: <Video className="h-3.5 w-3.5" /> },
  { key: 'mentions', label: 'Mentions', icon: <AtSign className="h-3.5 w-3.5" /> },
] as const;

const PAGE_SIZE = 20;

// Thread skeleton for loading states
function ThreadSkeleton() {
  return (
    <div className="p-4 border-b border-border/60 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="flex gap-4 mt-2">
            <div className="h-3 w-12 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<FeedTab>('latest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newThreadsCount, setNewThreadsCount] = useState(0);

  const { toast } = useToast();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async (tab: FeedTab, currentOffset: number, append = false) => {
    try {
      let fetched: Thread[] = [];
      switch (tab) {
        case 'trending':
          fetched = await getTrendingThreads();
          setHasMore(false);
          break;
        case 'following':
          fetched = await getThreadsOptimized(PAGE_SIZE, currentOffset, undefined, true);
          setHasMore(fetched.length === PAGE_SIZE);
          break;
        case 'mentions':
          fetched = await getMentionThreads();
          setHasMore(false);
          break;
        case 'videos':
          fetched = await getVideoFeed();
          setHasMore(false);
          break;
        case 'latest':
        default:
          fetched = await getMixedFeed(PAGE_SIZE, currentOffset);
          setHasMore(fetched.length === PAGE_SIZE);
          break;
      }
      setThreads(prev => (append ? [...prev, ...fetched] : fetched));
      return fetched;
    } catch (error: any) {
      toast({ title: 'Error loading feed', description: error.message, variant: 'destructive' });
      return [];
    }
  }, [toast]);

  const loadInitial = useCallback(async (tab: FeedTab) => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    setNewThreadsCount(0);
    await fetchThreads(tab, 0, false);
    setLoading(false);
  }, [fetchThreads]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    await fetchThreads(activeTab, nextOffset, true);
    setOffset(nextOffset);
    setLoadingMore(false);
  }, [loadingMore, hasMore, activeTab, offset, fetchThreads]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await loadInitial(activeTab);
    setIsRefreshing(false);
  }, [isRefreshing, loadInitial, activeTab]);

  // Pull to refresh
  useEffect(() => {
    const threshold = 90;
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) { startY.current = e.touches[0].clientY; pulling.current = true; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const diff = (e.touches[0].clientY - startY.current) / 2;
      if (diff > threshold) { pulling.current = false; handleRefresh(); }
    };
    const onTouchEnd = () => { pulling.current = false; };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleRefresh]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1, rootMargin: '400px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  useEffect(() => { loadInitial(activeTab); }, [activeTab]);

  useEffect(() => {
    getSuggestedUsers().then(setSuggestedUsers).catch(console.error);
  }, []);

  const handleTabChange = (tab: FeedTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SUGGESTION_POSITIONS = [5, 15, 30];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-2 text-sm text-muted-foreground gap-2 border-b border-border/40">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Refreshing...
        </div>
      )}

      {/* New threads notification */}
      {newThreadsCount > 0 && (
        <button
          onClick={() => { handleRefresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce"
        >
          <RefreshCw className="h-3 w-3" />
          {newThreadsCount} new thread{newThreadsCount > 1 ? 's' : ''}
        </button>
      )}

      <main className="container max-w-2xl mx-auto pb-24">
        {/* Stories */}
        <StoriesBar />

        <CreateThread onThreadCreated={() => loadInitial(activeTab)} />

        {/* Tabs */}
        <div ref={tabsRef} className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key as FeedTab)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all relative ${
                  activeTab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {icon}
                {label}
                {activeTab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div>
            {[...Array(6)].map((_, i) => <ThreadSkeleton key={i} />)}
          </div>
        ) : threads.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Sparkles className="h-12 w-12" />
            <p className="font-medium">Nothing here yet</p>
            <p className="text-sm text-center max-w-xs">
              {activeTab === 'following' ? 'Follow some people to see their threads here!' : 'Be the first to post!'}
            </p>
          </div>
        ) : (
          <>
            {threads.map((thread, index) => (
              <div key={`${thread.id}-${index}`}>
                <ThreadCard thread={thread} onUpdate={() => loadInitial(activeTab)} />
                {SUGGESTION_POSITIONS.includes(index + 1) && suggestedUsers.length > 0 && (
                  <SuggestedContent users={suggestedUsers} onFollowChange={() => getSuggestedUsers().then(setSuggestedUsers)} />
                )}
                {index > 0 && (index + 1) % 8 === 0 && (
                  <AdSlot position="feed" className="my-2" />
                )}
              </div>
            ))}

            <div ref={sentinelRef} className="py-6 flex justify-center">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {!hasMore && threads.length > 0 && (
                <p className="text-xs text-muted-foreground">You're all caught up! 🎉</p>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
