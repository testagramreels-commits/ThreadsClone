import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, MapPin, Calendar, Settings, Eye, MessageCircle, MoreHorizontal, Share, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ThreadCard } from '@/components/features/ThreadCard';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { AdSlot } from '@/components/features/AdSlot';
import { getUserProfile, getUserThreads, toggleFollow, getOrCreateConversation } from '@/lib/api';
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
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    if (!username) {
      // If no username in URL, use current user's username
      if (currentUser?.username) {
        navigate(`/profile/${currentUser.username}`, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      return;
    }
    
    try {
      const profileData = await getUserProfile(username);
      const threadsData = await getUserThreads(profileData.id);
      setProfile(profileData);
      setThreads(threadsData);
    } catch (error: any) {
      console.error('Profile load error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profile',
        variant: 'destructive',
      });
      // Redirect to home if profile not found
      setTimeout(() => navigate('/'), 2000);
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

  const handleMessage = async () => {
    if (!profile) return;
    
    setMessageLoading(true);
    try {
      const conversationId = await getOrCreateConversation(profile.id);
      navigate(`/messages/${conversationId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setMessageLoading(false);
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
      
      <main className="container max-w-2xl mx-auto pb-20 md:pb-4 px-0">
        {/* Profile Header Card */}
        <Card className="border-x-0 border-t-0 rounded-none">
          <div className="p-4 md:p-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Profile Header */}
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} />
                <AvatarFallback className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                  {profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold truncate">{profile.username}</h1>
                    <p className="text-sm md:text-base text-muted-foreground truncate">@{profile.username}</p>
                  </div>
                  {!isOwnProfile && (
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
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
                    <>
                      <Button 
                        variant={profile.is_following ? 'outline' : 'default'}
                        className="rounded-full flex-1 md:flex-none"
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        {followLoading ? 'Loading...' : profile.is_following ? 'Following' : 'Follow'}
                      </Button>
                      <Button 
                        variant="outline"
                        className="rounded-full"
                        onClick={handleMessage}
                        disabled={messageLoading}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="rounded-full" size="icon">
                        <Share className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-4">
              {profile.bio && (
                <p className="text-sm md:text-base leading-relaxed">{profile.bio}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 py-4 border-y">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold">{profile.threads_count || 0}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Threads</div>
                </div>
                <div className="text-center cursor-pointer hover:bg-accent rounded-lg transition-colors py-2">
                  <div className="text-xl md:text-2xl font-bold">{profile.followers_count || 0}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center cursor-pointer hover:bg-accent rounded-lg transition-colors py-2">
                  <div className="text-xl md:text-2xl font-bold">{profile.following_count || 0}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Following</div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                {profile.analytics && (
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>{profile.analytics.profile_views.toLocaleString()} views</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[150px]">{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="h-4 w-4" />
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline text-primary truncate max-w-[150px]"
                    >
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="border-b sticky top-16 glass-effect z-10">
          <div className="flex overflow-x-auto scrollbar-hide">
            <button className="flex-1 min-w-[100px] py-4 text-sm font-semibold border-b-2 border-foreground transition-colors">
              Threads
            </button>
            <button className="flex-1 min-w-[100px] py-4 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors">
              Replies
            </button>
            <button className="flex-1 min-w-[100px] py-4 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors">
              Media
            </button>
            <button className="flex-1 min-w-[100px] py-4 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors">
              Likes
            </button>
          </div>
        </div>

        <AdSlot position="profile" className="my-4" />

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
