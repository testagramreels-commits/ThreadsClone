import { useState, useEffect } from 'react';
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
import { Video, TrendingUp, Newspaper, Users, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const [allThreads, setAllThreads] = useState<Thread[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [trendingThreads, setTrendingThreads] = useState<Thread[]>([]);
  const [videoThreads, setVideoThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'latest' | 'trending' | 'following' | 'mentions' | 'videos'>('latest');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadThreads = async () => {
    try {
      let threads: Thread[];
      
      switch (activeTab) {
        case 'trending':
          threads = await getTrendingThreads();
          break;
        case 'following':
          threads = await getThreadsOptimized(50, 0, undefined, true);
          break;
        case 'mentions':
          threads = await getMentionThreads();
          break;
        case 'videos':
          threads = await getVideoFeed();
          break;
        case 'latest':
        default:
          // Use mixed feed that includes videos organically
          threads = await getMixedFeed(50);
          break;
      }
      
      setAllThreads(threads);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const [users, trending, videos] = await Promise.all([
        getSuggestedUsers(),
        getTrendingThreads().then(t => t.slice(0, 3)),
        getVideoFeed().then(v => v.slice(0, 2)),
      ]);
      setSuggestedUsers(users);
      setTrendingThreads(trending);
      setVideoThreads(videos);
    } catch (error: any) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleThreadCreated = () => {
    loadThreads();
  };

  const handleTabChange = (tab: 'latest' | 'trending' | 'following' | 'mentions' | 'videos') => {
    setActiveTab(tab);
    setLoading(true);
  };

  useEffect(() => {
    loadThreads();
    loadSuggestions();
  }, [activeTab]);

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
        
        {/* Horizontal Scrollable Tabs - App Style */}
        <div className="border-b sticky top-16 glass-effect z-10 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-[2px]">
            <button
              onClick={() => handleTabChange('latest')}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'latest' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Latest
            </button>
            <button
              onClick={() => handleTabChange('trending')}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'trending' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Trending
            </button>
            <button
              onClick={() => handleTabChange('following')}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'following' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Following
            </button>
            <button
              onClick={() => handleTabChange('videos')}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'videos' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Video className="h-4 w-4 inline mr-2" />
              Videos
            </button>
            <button
              onClick={() => handleTabChange('mentions')}
              className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === 'mentions' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Newspaper className="h-4 w-4 inline mr-2" />
              Mentions
            </button>
          </div>
        </div>

        {/* Quick Access Section - Only on Latest Tab */}
        {activeTab === 'latest' && suggestedUsers.length > 0 && (
          <Card className="mt-4 p-4 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Suggested Users</h3>
              </div>
              <button 
                onClick={() => navigate('/search')}
                className="text-sm text-primary hover:underline font-semibold"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {suggestedUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="p-3 bg-card rounded-lg border cursor-pointer hover:border-primary transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.followers_count || 0} followers
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Trending Preview - Only on Latest Tab */}
        {activeTab === 'latest' && trendingThreads.length > 0 && (
          <Card className="mt-4 p-4 bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-bold text-lg">Trending Now</h3>
              </div>
              <button 
                onClick={() => handleTabChange('trending')}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline font-semibold"
              >
                See all
              </button>
            </div>
            <div className="space-y-2">
              {trendingThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => navigate(`/thread/${thread.id}`)}
                  className="p-3 bg-card rounded-lg border cursor-pointer hover:border-orange-500/50 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {thread.user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">@{thread.user?.username}</p>
                      <p className="text-sm line-clamp-2 mt-1">{thread.content}</p>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>❤️ {thread.likes_count || 0}</span>
                        <span>💬 {thread.replies_count || 0}</span>
                        <span>🔁 {thread.reposts_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Video Preview - Only on Latest Tab */}
        {activeTab === 'latest' && videoThreads.length > 0 && (
          <Card className="mt-4 p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-lg">Latest Videos</h3>
              </div>
              <button 
                onClick={() => handleTabChange('videos')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {videoThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => navigate(`/thread/${thread.id}`)}
                  className="relative aspect-video bg-card rounded-lg border cursor-pointer hover:border-blue-500/50 transition-all hover:shadow-md overflow-hidden group"
                >
                  {thread.video_url && (
                    <video
                      src={thread.video_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                        {thread.user?.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold truncate">@{thread.user?.username}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                    <Video className="h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allThreads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No threads yet. Be the first to post!</p>
            </div>
          ) : (
            allThreads.map((thread, index) => (
              <div key={thread.id}>
                <ThreadCard thread={thread} onUpdate={loadThreads} />
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
            ))
          )}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
