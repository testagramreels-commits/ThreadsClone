import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { CreateThread } from '@/components/features/CreateThread';
import { ThreadCard } from '@/components/features/ThreadCard';
import { SuggestedContent } from '@/components/features/SuggestedContent';
import { AdSlot } from '@/components/features/AdSlot';
import { BottomNav } from '@/components/features/BottomNav';
import { getMixedFeed, getThreadsOptimized } from '@/lib/optimizedApi';
import { getSuggestedUsers, getTrendingThreads, getMentionThreads } from '@/lib/api';
import { Thread, UserWithStats } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const [allThreads, setAllThreads] = useState<Thread[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'latest' | 'trending' | 'following' | 'mentions'>('latest');
  const { toast } = useToast();
  const navigate = useNavigate();
  const observerTarget = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

  const loadThreads = async (pageNum: number = 0, append: boolean = false) => {
    const loadingState = append ? setLoadingMore : setLoading;
    loadingState(true);
    
    try {
      let threads: Thread[];
      const offset = pageNum * ITEMS_PER_PAGE;
      
      switch (activeTab) {
        case 'trending':
          threads = await getTrendingThreads();
          // Trending doesn't support pagination, so limit it
          threads = threads.slice(offset, offset + ITEMS_PER_PAGE);
          break;
        case 'following':
          threads = await getThreadsOptimized(ITEMS_PER_PAGE, offset, undefined, true);
          break;
        case 'mentions':
          const allMentions = await getMentionThreads();
          threads = allMentions.slice(offset, offset + ITEMS_PER_PAGE);
          break;
        case 'latest':
        default:
          threads = await getMixedFeed(ITEMS_PER_PAGE + offset);
          threads = threads.slice(offset, offset + ITEMS_PER_PAGE);
          break;
      }
      
      if (threads.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }
      
      if (append) {
        setAllThreads(prev => [...prev, ...threads]);
      } else {
        setAllThreads(threads);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      loadingState(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadThreads(nextPage, true);
    }
  }, [page, loadingMore, hasMore, activeTab]);

  const loadSuggestions = async () => {
    try {
      const data = await getSuggestedUsers();
      setSuggestedUsers(data);
    } catch (error: any) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleThreadCreated = () => {
    loadThreads();
  };

  const handleTabChange = (tab: 'latest' | 'trending' | 'following' | 'mentions') => {
    setActiveTab(tab);
    setPage(0);
    setHasMore(true);
    setAllThreads([]);
    setLoading(true);
  };

  useEffect(() => {
    loadThreads(0, false);
    loadSuggestions();
  }, [activeTab]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  // Suggestion intervals: after 4, 14, 29, 49 posts
  const getSuggestionPositions = () => {
    return [4, 14, 29, 49];
  };

  const shouldShowSuggestion = (index: number) => {
    return getSuggestionPositions().includes(index);
  };

  const shouldShowAd = (index: number) => {
    // Show ads after every 7 posts
    return index > 0 && index % 7 === 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <CreateThread onThreadCreated={handleThreadCreated} />
        
        {/* Horizontal Scrollable Tabs */}
        <div className="border-b sticky top-16 glass-effect z-10 overflow-x-auto">
          <div className="flex min-w-max">
            <button
              onClick={() => handleTabChange('latest')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'latest' 
                  ? 'border-b-2 border-foreground' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => handleTabChange('trending')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'trending' 
                  ? 'border-b-2 border-foreground' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Trending
            </button>
            <button
              onClick={() => handleTabChange('following')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'following' 
                  ? 'border-b-2 border-foreground' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Following
            </button>
            <button
              onClick={() => handleTabChange('mentions')}
              className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'mentions' 
                  ? 'border-b-2 border-foreground' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              Mentions
            </button>
            <button
              onClick={() => navigate('/videos')}
              className="px-6 py-4 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors whitespace-nowrap flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              Videos
            </button>
          </div>
        </div>

        <div className="divide-y">
          {loading && allThreads.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allThreads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No threads yet. Be the first to post!</p>
            </div>
          ) : (
            <>
              {allThreads.map((thread, index) => (
                <div key={thread.id}>
                  <ThreadCard thread={thread} onUpdate={() => loadThreads(0, false)} />
                  {shouldShowSuggestion(index + 1) && (
                    <SuggestedContent 
                      users={suggestedUsers} 
                      onFollowChange={loadSuggestions}
                    />
                  )}
                  {shouldShowAd(index + 1) && (
                    <AdSlot position="feed" className="my-4" />
                  )}
                </div>
              ))}
              
              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="py-8">
                {loadingMore && (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading more...</span>
                  </div>
                )}
                {!hasMore && allThreads.length > 0 && (
                  <p className="text-center text-muted-foreground">You've reached the end!</p>
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
