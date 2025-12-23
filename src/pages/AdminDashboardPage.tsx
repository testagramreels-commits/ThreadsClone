import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, FileText, Heart, MessageCircle, 
  Share2, Video, TrendingUp, BarChart3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { isAdmin, getPlatformAnalytics } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface PlatformStats {
  totalUsers: number;
  totalThreads: number;
  totalLikes: number;
  totalReplies: number;
  totalFollows: number;
  videoThreads: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const adminStatus = await isAdmin();
      if (!adminStatus) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      setHasAccess(true);
      await loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const loadStats = async () => {
    try {
      const data = await getPlatformAnalytics();
      setStats(data);
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

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl mx-auto pb-20 md:pb-4 p-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform analytics and insights</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Threads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalThreads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Posts created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Video Threads</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.videoThreads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalThreads ? 
                  `${Math.round((stats.videoThreads / stats.totalThreads) * 100)}% of all threads` 
                  : '0% of all threads'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLikes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {stats?.totalThreads ? (stats.totalLikes / stats.totalThreads).toFixed(1) : '0'} per thread
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Replies</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReplies.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {stats?.totalThreads ? (stats.totalReplies / stats.totalThreads).toFixed(1) : '0'} per thread
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Follows</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFollows.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {stats?.totalUsers ? (stats.totalFollows / stats.totalUsers).toFixed(1) : '0'} per user
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Engagement Metrics
            </CardTitle>
            <CardDescription>Platform engagement and growth indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">User Activity Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.totalUsers && stats?.totalThreads 
                      ? `${((stats.totalThreads / stats.totalUsers) * 100).toFixed(1)}%` 
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ 
                      width: stats?.totalUsers && stats?.totalThreads 
                        ? `${Math.min(((stats.totalThreads / stats.totalUsers) * 100), 100)}%` 
                        : '0%'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Video Content Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.totalThreads && stats?.videoThreads 
                      ? `${((stats.videoThreads / stats.totalThreads) * 100).toFixed(1)}%` 
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: stats?.totalThreads && stats?.videoThreads 
                        ? `${(stats.videoThreads / stats.totalThreads) * 100}%` 
                        : '0%'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Social Connection Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.totalUsers && stats?.totalFollows 
                      ? `${((stats.totalFollows / stats.totalUsers) * 100).toFixed(1)}%` 
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: stats?.totalUsers && stats?.totalFollows 
                        ? `${Math.min(((stats.totalFollows / stats.totalUsers) * 100), 100)}%` 
                        : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Monetization Integration</CardTitle>
            <CardDescription>Google AdSense setup for web monetization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To monetize your platform with Google AdSense:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Sign up for Google AdSense at <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">google.com/adsense</a></li>
                <li>Get your AdSense publisher ID</li>
                <li>Add ad units to strategic locations (feed, profile pages, video pages)</li>
                <li>Follow AdSense policies to avoid account suspension</li>
              </ol>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Recommended Ad Placements:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Between threads in the main feed (every 5-7 threads)</li>
                  <li>Sidebar on desktop view</li>
                  <li>Bottom of profile pages</li>
                  <li>Pre-roll ads for video content</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
