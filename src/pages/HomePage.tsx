import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { CreateThread } from '@/components/features/CreateThread';
import { ThreadCard } from '@/components/features/ThreadCard';
import { UserSuggestionCard } from '@/components/features/UserSuggestionCard';
import { BottomNav } from '@/components/features/BottomNav';
import { getThreads, getSuggestedUsers, getTrendingThreads } from '@/lib/api';
import { Thread, UserWithStats } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [trendingThreads, setTrendingThreads] = useState<Thread[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'foryou' | 'trending'>('foryou');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadThreads = async () => {
    try {
      const data = await getThreads();
      setThreads(data);
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

  const loadTrending = async () => {
    try {
      const data = await getTrendingThreads();
      setTrendingThreads(data);
    } catch (error: any) {
      console.error('Failed to load trending:', error);
    }
  };

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
    loadTrending();
  };

  useEffect(() => {
    loadThreads();
    loadTrending();
    loadSuggestions();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto pb-20 md:pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            <CreateThread onThreadCreated={handleThreadCreated} />
            
            {/* Tab Navigation */}
            <div className="border-b flex sticky top-16 glass-effect z-10">
              <button
                onClick={() => setActiveTab('foryou')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'foryou' 
                    ? 'border-b-2 border-foreground' 
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'trending' 
                    ? 'border-b-2 border-foreground' 
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </button>
            </div>

            <div className="divide-y">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activeTab === 'foryou' ? (
                threads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No threads yet. Be the first to post!</p>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <ThreadCard key={thread.id} thread={thread} />
                  ))
                )
              ) : (
                trendingThreads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No trending threads yet</p>
                  </div>
                ) : (
                  trendingThreads.map((thread) => (
                    <ThreadCard key={thread.id} thread={thread} />
                  ))
                )
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block space-y-4 sticky top-20 h-fit">
            {/* Video Feed Button */}
            <div className="border rounded-xl p-4 glass-effect">
              <Button
                onClick={() => navigate('/videos')}
                className="w-full gap-2"
                variant="default"
              >
                <Video className="h-5 w-5" />
                Watch Videos
              </Button>
            </div>

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <div className="border rounded-xl p-4 glass-effect">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">Suggested for you</h2>
                </div>
                <div className="space-y-2">
                  {suggestedUsers.map((user) => (
                    <UserSuggestionCard 
                      key={user.id} 
                      user={user} 
                      onFollowChange={loadSuggestions}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
