import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Link as LinkIcon, MapPin, Calendar, Settings,
  Eye, MessageCircle, MoreHorizontal, Share2, Grid3x3,
  Heart, Repeat2, Loader2, UserCheck, UserPlus, BarChart3,
  BadgeCheck, Megaphone, DollarSign, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThreadCard } from '@/components/features/ThreadCard';
import { BottomNav } from '@/components/features/BottomNav';
import { AdSlot } from '@/components/features/AdSlot';
import { TipModal } from '@/components/features/TipModal';
import {
  getUserProfile, getUserThreads, toggleFollow,
  getOrCreateConversation, getUserLikedThreads
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { UserWithStats, Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type ProfileTab = 'threads' | 'replies' | 'media' | 'likes';

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserWithStats | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('threads');
  const [showTip, setShowTip] = useState(false);
  const [isMonetized, setIsMonetized] = useState(false);

  const isOwnProfile =
    !!(currentUser && (
      currentUser.username === username ||
      currentUser.id === username ||
      (username && currentUser.email?.split('@')[0] === username)
    ));

  useEffect(() => {
    if (!username || username === 'undefined' || username === 'null') {
      if (currentUser?.username) navigate(`/profile/${currentUser.username}`, { replace: true });
      else if (currentUser?.id) {
        // Try to load by ID
        loadProfileById(currentUser.id);
      } else navigate('/login', { replace: true });
      return;
    }
    loadProfile();
  }, [username, currentUser?.id]);

  const loadProfileById = async (userId: string) => {
    setLoading(true);
    try {
      const { data: byId } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (byId) {
        if (byId.username) {
          navigate(`/profile/${byId.username}`, { replace: true });
        } else {
          // No username set yet - show profile directly
          const [followersRes, followingRes, threadsRes] = await Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', byId.id),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', byId.id),
            supabase.from('threads').select('*', { count: 'exact', head: true }).eq('user_id', byId.id),
          ]);
          const profileData: UserWithStats = {
            ...byId,
            followers_count: followersRes.count || 0,
            following_count: followingRes.count || 0,
            threads_count: threadsRes.count || 0,
            is_following: false,
          };
          setProfile(profileData);
          const t = await getUserThreads(byId.id);
          setThreads(t);
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      console.error('loadProfileById error:', e);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!username || username === 'undefined' || username === 'null') return;
    setLoading(true);
    try {
      let profileData: UserWithStats | null = null;

      // 1. Try lookup by username first
      const { data: byUsername } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (byUsername) {
        profileData = await getUserProfile(username);
      } else {
        // 2. Try lookup by ID (maybe username is actually a UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(username)) {
          const { data: byId } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', username)
            .maybeSingle();
          if (byId?.username) {
            navigate(`/profile/${byId.username}`, { replace: true });
            return;
          } else if (byId) {
            const [followersRes, followingRes, threadsRes] = await Promise.all([
              supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', byId.id),
              supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', byId.id),
              supabase.from('threads').select('*', { count: 'exact', head: true }).eq('user_id', byId.id),
            ]);
            profileData = {
              ...byId,
              followers_count: followersRes.count || 0,
              following_count: followingRes.count || 0,
              threads_count: threadsRes.count || 0,
              is_following: false,
            } as UserWithStats;
          }
        } else if (currentUser) {
          // 3. Check if it's the current user's profile by other means
          if (username === currentUser.id) {
            await loadProfileById(currentUser.id);
            return;
          }
        }
      }

      if (!profileData) {
        toast({ title: 'Profile not found', description: 'This user does not exist', variant: 'destructive' });
        setTimeout(() => navigate('/'), 1500);
        return;
      }

      setProfile(profileData);

      // Check if creator is monetized
      const { data: creatorSettings } = await supabase
        .from('creator_settings')
        .select('is_monetized, tip_enabled')
        .eq('user_id', profileData.id)
        .maybeSingle();
      setIsMonetized(creatorSettings?.is_monetized && creatorSettings?.tip_enabled);

      const t = await getUserThreads(profileData.id);
      setThreads(t);
    } catch (error: any) {
      console.error('Profile load error:', error);
      toast({ title: 'Profile not found', description: 'This user does not exist', variant: 'destructive' });
      setTimeout(() => navigate('/'), 1500);
    } finally {
      setLoading(false);
    }
  };

  const loadTabContent = async (tab: ProfileTab, profileId: string) => {
    setLoadingMore(true);
    try {
      if (tab === 'threads') {
        setThreads(await getUserThreads(profileId));
      } else if (tab === 'likes') {
        setThreads(await getUserLikedThreads(profileId));
      } else if (tab === 'replies') {
        const { data: replies } = await supabase
          .from('thread_replies')
          .select('thread_id')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (replies && replies.length > 0) {
          const threadIds = [...new Set(replies.map((r: any) => r.thread_id))];
          const { data: replyThreads } = await supabase
            .from('threads')
            .select('*, user:user_profiles(id, username, email, avatar_url)')
            .in('id', threadIds);
          setThreads((replyThreads || []) as Thread[]);
        } else {
          setThreads([]);
        }
      } else {
        setThreads([]);
      }
    } catch { setThreads([]); }
    finally { setLoadingMore(false); }
  };

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    if (profile) loadTabContent(tab, profile.id);
  };

  // ---- Add isVerified helper ----
  const isVerified = (profile?.is_verified) || ((profile?.followers_count || 0) >= 500);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      const followed = await toggleFollow(profile.id);
      setProfile({
        ...profile,
        is_following: followed,
        followers_count: followed ? (profile.followers_count || 0) + 1 : Math.max(0, (profile.followers_count || 0) - 1),
      });
      toast({ title: followed ? 'Following!' : 'Unfollowed', description: `@${profile.username}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setFollowLoading(false); }
  };

  const handleMessage = async () => {
    if (!profile) return;
    const id = await getOrCreateConversation(profile.id);
    navigate(`/messages/${id}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${profile?.username}`;
    if (navigator.share) {
      navigator.share({ title: `@${profile?.username}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  const mediaThreads = threads.filter(t => t.image_url || t.video_url);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="h-32 bg-muted animate-pulse" />
          <div className="px-4 pt-16">
            <div className="h-6 w-40 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
            <div className="h-16 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <UserPlus className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg font-medium">User not found</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const displayThreads = activeTab === 'media' ? mediaThreads : threads;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full flex-shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base truncate">{profile.username}</h1>
              {isVerified && (
                <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{(profile.threads_count || 0).toLocaleString()} threads</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>Share Profile</DropdownMenuItem>
              {isOwnProfile && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/analytics')}>
                    <BarChart3 className="h-4 w-4 mr-2" /> Creator Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/monetization')}>
                    <DollarSign className="h-4 w-4 mr-2" /> Monetization
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/create-ad')}>
                    <Megaphone className="h-4 w-4 mr-2" /> Promote Content
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28">
        {/* Cover + Avatar */}
        <div className="relative">
          <div className="h-36 bg-gradient-to-br from-primary/30 via-purple-500/20 to-blue-500/30" />
          <div className="absolute left-4 -bottom-14">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-2xl">
              <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                {profile.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Action buttons */}
          <div className="absolute right-4 bottom-3 flex gap-2">
            {isOwnProfile ? (
              <>
                <Button variant="outline" size="sm" className="rounded-full text-xs h-9 px-4 font-semibold" onClick={() => navigate('/profile/edit')}>
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" className="rounded-full text-xs h-9 px-3" onClick={() => navigate('/analytics')}>
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                {isMonetized && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-9 px-3 text-amber-500 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    onClick={() => setShowTip(true)}
                  >
                    <Gift className="h-3.5 w-3.5 mr-1" /> Tip
                  </Button>
                )}
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={handleMessage}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant={profile.is_following ? 'outline' : 'default'}
                  size="sm"
                  className="rounded-full text-xs h-9 px-4 min-w-[90px] font-semibold"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : profile.is_following ? (
                    <><UserCheck className="h-3.5 w-3.5 mr-1" />Following</>
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5 mr-1" />Follow</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Profile info */}
        <div className="px-4 pt-16 pb-4">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-xl font-bold">{profile.username}</h2>
            {isVerified && (
              <BadgeCheck className="h-5 w-5 text-primary" />
            )}
            {isMonetized && (
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <DollarSign className="h-2.5 w-2.5" /> Creator
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>

          {profile.bio && (
            <p className="mt-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {profile.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </a>
            )}
            {profile.created_at && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
              </div>
            )}
            {profile.analytics && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                <span>{(profile.analytics.profile_views || 0).toLocaleString()} profile views</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-border/60">
            <div className="text-center">
              <p className="text-lg font-bold">{(profile.threads_count || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Threads</p>
            </div>
            <button className="text-center hover:opacity-70 transition-opacity">
              <p className="text-lg font-bold">{(profile.followers_count || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </button>
            <button className="text-center hover:opacity-70 transition-opacity">
              <p className="text-lg font-bold">{(profile.following_count || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </button>
            {isOwnProfile && (
              <button
                className="text-center hover:opacity-70 transition-opacity ml-auto"
                onClick={() => navigate('/analytics')}
              >
                <p className="text-lg font-bold">{(profile.analytics?.profile_views || 0).toLocaleString()}</p>
                <p className="text-xs text-primary font-medium">Views</p>
              </button>
            )}
          </div>

          {/* Monetization CTA for own profile */}
          {isOwnProfile && !isMonetized && (
            <button
              onClick={() => navigate('/monetization')}
              className="mt-4 w-full flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 text-left hover:opacity-90 transition-opacity"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Start earning on Threads</p>
                <p className="text-xs text-amber-600 dark:text-amber-500">Enable tips, subscriptions & exclusive content</p>
              </div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Set up →</span>
            </button>
          )}
        </div>

        <AdSlot position="profile" className="mx-4 mb-2" />

        {/* Tabs */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-y border-border/60">
          <div className="flex">
            {(['threads', 'replies', 'media', 'likes'] as ProfileTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition-all relative ${
                  activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'media' ? <Grid3x3 className="h-4 w-4 mx-auto" /> : tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loadingMore ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'media' ? (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {mediaThreads.length === 0 ? (
              <div className="col-span-3 py-16 text-center">
                <Grid3x3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No media yet</p>
                {isOwnProfile && <p className="text-xs text-muted-foreground mt-1">Post photos or videos to see them here</p>}
              </div>
            ) : mediaThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => navigate(`/thread/${thread.id}`)}
                className="aspect-square relative overflow-hidden bg-muted hover:opacity-90 transition-opacity"
              >
                {thread.video_url ? (
                  <video src={thread.video_url} className="w-full h-full object-cover" muted preload="none" />
                ) : (
                  <img src={thread.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        ) : displayThreads.length === 0 ? (
          <div className="py-16 text-center">
            {activeTab === 'likes' ? (
              <><Heart className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground text-sm">No liked threads yet</p></>
            ) : activeTab === 'replies' ? (
              <><MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground text-sm">No replies yet</p></>
            ) : (
              <div>
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Repeat2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No threads yet</p>
                {isOwnProfile && <p className="text-xs text-muted-foreground mt-1">Share your first thought with the world</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {displayThreads.map(thread => (
              <ThreadCard key={thread.id} thread={thread} onUpdate={() => loadTabContent(activeTab, profile.id)} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* Tip Modal */}
      {showTip && profile && (
        <TipModal
          creator={profile}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}
