import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, MapPin, Calendar, Settings, Eye, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThreadCard } from '@/components/features/ThreadCard';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { getUserProfile, getUserThreads, toggleFollow } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { UserWithStats, Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserWithStats | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    if (!username) return;
    
    try {
      const profileData = await getUserProfile(username);
      const threadsData = await getUserThreads(profileData.id);
      setProfile(profileData);
      setThreads(threadsData);
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

  const handleFollow = async () => {
    if (!profile) return;
    
    setFollowLoading(true);
    try {
      const followed = await toggleFollow(profile.id);
      setProfile({
        ...profile,
        is_following: followed,
        followers_count: followed 
          ? (profile.followers_count || 0) + 1 
          : (profile.followers_count || 0) - 1,
      });
      toast({
        title: followed ? 'Following!' : 'Unfollowed',
        description: followed ? `You're now following @${profile.username}` : `You unfollowed @${profile.username}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const isOwnProfile = currentUser?.username === username;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b">
          <div className="p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-start justify-between mb-4">
              <Avatar className="h-20 w-20 ring-2 ring-background">
                <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} />
                <AvatarFallback className="text-2xl">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              {isOwnProfile ? (
                <Button 
                  variant="outline" 
                  className="rounded-full"
                  onClick={() => navigate('/profile/edit')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <Button 
                  variant={profile.is_following ? 'outline' : 'default'}
                  className="rounded-full"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? 'Loading...' : profile.is_following ? 'Following' : 'Follow'}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <h1 className="text-xl font-bold">{profile.username}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>

              {profile.bio && (
                <p className="text-sm">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{profile.followers_count || 0}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{profile.following_count || 0}</span>
                  <span className="text-muted-foreground">following</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.analytics && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{profile.analytics.profile_views.toLocaleString()} views</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t">
            <div className="flex">
              <button className="flex-1 py-4 text-sm font-semibold border-b-2 border-foreground">
                Threads
              </button>
              <button className="flex-1 py-4 text-sm font-semibold text-muted-foreground hover:bg-accent">
                Replies
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y">
          {threads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No threads yet</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
