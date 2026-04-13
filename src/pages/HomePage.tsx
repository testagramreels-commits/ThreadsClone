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

const TABS: { key: FeedTab; label: string; icon: React.ReactNode }[] = [
  { key: 'latest', label: 'Latest', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: 'trending', label: 'Trending', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: 'following', label: 'Following', icon: <Users className="h-3.5 w-3.5" /> },
  { key: 'videos', label: 'Videos', icon: <Video className="h-3.5 w-3.5" /> },
  { key: 'mentions', label: 'Mentions', icon: <AtSign className="h-3.5 w-3.5" /> },
];

const PAGE_SIZE = 15;

export function HomePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<FeedTab>('latest');
  const { toast } = useToast();
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchThreads = useCallback(async (tab: FeedTab, currentOffset: number, append = false) => {
    try {
      let fetched: Thread[];
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
      setThreads(prev => append ? [...prev, ...fetched] : fetched);
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

  // Intersection Observer for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SUGGESTION_POSITIONS = [4, 14, 29];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-24">
        <CreateThread onThreadCreated={() => loadInitial(activeTab)} />

        {/* Sticky Tab Bar */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all relative flex-shrink-0 ${
                  activeTab === key
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {icon}
                {label}
                {activeTab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div>
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading feed…</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-lg font-medium">Nothing here yet</p>
              <p className="text-sm mt-1">Be the first to post!</p>
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

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-4 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more…
                  </div>
                )}
                {!hasMore && threads.length > 0 && (
                  <p className="text-xs text-muted-foreground">You're all caught up!</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
