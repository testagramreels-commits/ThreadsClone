import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Flame, Users, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { UserSuggestionCard } from '@/components/features/UserSuggestionCard';
import { getTrendingThreads, getTrendingHashtags, getSuggestedUsers, getVideoFeed } from '@/lib/api';
import { Thread, TrendingHashtag, UserWithStats } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function TrendingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trendingThreads, setTrendingThreads] = useState<Thread[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<UserWithStats[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'threads' | 'hashtags' | 'users' | 'videos'>('threads');

  useEffect(() => {
    loadTrendingContent();
  }, []);

  const loadTrendingContent = async () => {
    setLoading(true);
    try {
      const [threads, hashtags, users, videos] = await Promise.all([
        getTrendingThreads(),
        getTrendingHashtags(),
        getSuggestedUsers(),
        getVideoFeed()
      ]);
      
      setTrendingThreads(threads.slice(0, 20));
      setTrendingHashtags(hashtags);
      setTrendingUsers(users);
      setTrendingVideos(videos.slice(0, 10));
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'threads':
        return (
          <div className="divide-y">
            {trendingThreads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} onUpdate={loadTrendingContent} />
            ))}
          </div>
        );
      
      case 'hashtags':
        return (
          <div className="p-4 space-y-3">
            {trendingHashtags.map((hashtag, index) => (
              <Card key={hashtag.hashtag} className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg text-primary">{hashtag.hashtag}</CardTitle>
                        <CardDescription>{hashtag.count} {hashtag.count === 1 ? 'thread' : 'threads'}</CardDescription>
                      </div>
                    </div>
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        );
      
      case 'users':
        return (
          <div className="p-4 space-y-3">
            {trendingUsers.map((user) => (
              <UserSuggestionCard key={user.id} user={user} onFollowChange={loadTrendingContent} />
            ))}
          </div>
        );
      
      case 'videos':
        return (
          <div className="divide-y">
            {trendingVideos.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} onUpdate={loadTrendingContent} />
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4 px-0">
        {/* Header */}
        <div className="border-b p-4 sticky top-16 glass-effect z-10">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Trending Now
              </h1>
              <p className="text-sm text-muted-foreground">Discover what's popular on Threads</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide gap-2">
            <Button
              variant={activeTab === 'threads' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('threads')}
              className="whitespace-nowrap"
            >
              <Flame className="h-4 w-4 mr-2" />
              Threads
            </Button>
            <Button
              variant={activeTab === 'hashtags' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('hashtags')}
              className="whitespace-nowrap"
            >
              #️⃣ Hashtags
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('users')}
              className="whitespace-nowrap"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
            <Button
              variant={activeTab === 'videos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('videos')}
              className="whitespace-nowrap"
            >
              <VideoIcon className="h-4 w-4 mr-2" />
              Videos
            </Button>
          </div>
        </div>

        {renderContent()}
      </main>

      <BottomNav />
    </div>
  );
}
