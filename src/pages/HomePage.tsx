import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { CreateThread } from '@/components/features/CreateThread';
import { ThreadCard } from '@/components/features/ThreadCard';
import { SuggestedContent } from '@/components/features/SuggestedContent';
import { AdSlot } from '@/components/features/AdSlot';
import { BottomNav } from '@/components/features/BottomNav';
import { getMixedFeed, getThreadsOptimized } from '@/lib/optimizedApi';
import { getSuggestedUsers, getTrendingThreads, getMentionThreads, getVideoFeed } from '@/lib/api';
import { Thread, UserWithStats } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Video, TrendingUp, Users, Sparkles, AtSign, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type FeedTab = 'latest' | 'trending' | 'following' | 'mentions' | 'videos';

const TABS = [
  { key: 'latest', label: 'Latest', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: 'trending', label: 'Trending', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: 'following', label: 'Following', icon: <Users className="h-3.5 w-3.5" /> },
  { key: 'videos', label: 'Videos', icon: <Video className="h-3.5 w-3.5" /> },
  { key: 'mentions', label: 'Mentions', icon: <AtSign className="h-3.5 w-3.5" /> },
] as const;

const PAGE_SIZE = 15;

export function HomePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<FeedTab>('latest');

  // 🔥 Pull-to-refresh state
  const startY = useRef(0);
  const pulling = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* =========================
     FETCH LOGIC
  ========================= */
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
          fetched = await getMixedFeed(PAGE_SIZE);
          setHasMore(fetched.length === PAGE_SIZE);
          break;
      }

      setThreads(prev => (append ? [...prev, ...fetched] : fetched));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const loadInitial = useCallback(async (tab: FeedTab) => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    await fetchThreads(tab, 0, false);
    setLoading(false);
  }, [fetchThreads]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || activeTab !== 'latest') return;

    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;

    await fetchThreads(activeTab, nextOffset, true);
    setOffset(nextOffset);

    setLoadingMore(false);
  }, [loadingMore, hasMore, activeTab, offset, fetchThreads]);

  /* =========================
     PULL TO REFRESH (ORIGINAL LOGIC)
  ========================= */
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    await loadInitial(activeTab);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    const threshold = 85;
    const resistance = 1.8;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;

      const currentY = e.touches[0].clientY;
      const diff = (currentY - startY.current) / resistance;

      // prevent accidental triggers
      if (diff > threshold) {
        pulling.current = false;
        handleRefresh();
      }
    };

    const onTouchEnd = () => {
      pulling.current = false;
    };

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleRefresh]);

  /* =========================
     INFINITE SCROLL
  ========================= */
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  useEffect(() => {
    loadInitial(activeTab);
  }, [activeTab]);

  useEffect(() => {
    getSuggestedUsers().then(setSuggestedUsers).catch(console.error);
  }, []);

  const handleTabChange = (tab: FeedTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const SUGGESTION_POSITIONS = [4, 14, 29];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* 🔥 Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Refreshing...
        </div>
      )}

      <main className="container max-w-2xl mx-auto pb-24">
        <CreateThread onThreadCreated={() => loadInitial(activeTab)} />

        {/* Tabs */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold ${
                  activeTab === key
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading feed…</p>
          </div>
        ) : (
          <>
            {threads.map((thread, index) => (
              <div key={`${thread.id}-${index}`}>
                <ThreadCard thread={thread} onUpdate={() => loadInitial(activeTab)} />

                {SUGGESTION_POSITIONS.includes(index + 1) && suggestedUsers.length > 0 && (
                  <SuggestedContent
                    users={suggestedUsers}
                    onFollowChange={() => getSuggestedUsers().then(setSuggestedUsers)}
                  />
                )}

                {index > 0 && (index + 1) % 7 === 0 && (
                  <AdSlot position="feed" className="my-2" />
                )}
              </div>
            ))}

            <div ref={sentinelRef} className="py-4 flex justify-center">
              {loadingMore && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!hasMore && threads.length > 0 && (
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
                }
