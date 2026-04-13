import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, Repeat2, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getVideoFeed, toggleThreadLike, toggleFollow } from '@/lib/api';
import { Thread } from '@/types/database';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

function TikTokVideoSlide({
  thread,
  isActive,
  muted,
  onMuteToggle,
}: {
  thread: Thread;
  isActive: boolean;
  muted: boolean;
  onMuteToggle: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(thread.is_liked || false);
  const [likeCount, setLikeCount] = useState(thread.likes_count || 0);
  const [following, setFollowing] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
      setPaused(false);
    } else {
      vid.pause();
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const handleTap = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) { vid.play(); setPaused(false); }
    else { vid.pause(); setPaused(true); }
  };

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const result = await toggleThreadLike(thread.id);
      setLiked(result);
      setLikeCount(prev => result ? prev + 1 : prev - 1);
    } catch { /* ignore */ }
  };

  const handleFollow = async () => {
    if (!user || !thread.user?.id) return;
    try {
      const result = await toggleFollow(thread.user.id);
      setFollowing(result);
      toast({ title: result ? 'Following' : 'Unfollowed', description: `@${thread.user.username}` });
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/thread/${thread.id}`;
    if (navigator.share) {
      navigator.share({ title: `@${thread.user?.username}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {/* Video */}
      <video
        ref={videoRef}
        src={thread.video_url || ''}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        onClick={handleTap}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Pause indicator */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-5">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          </div>
        </div>
      )}

      {/* Mute button top-right */}
      <button
        onClick={onMuteToggle}
        className="absolute top-16 right-4 z-20 bg-black/40 rounded-full p-2.5"
      >
        {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
      </button>

      {/* Right action bar */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
        {/* Avatar + follow */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative">
            <Avatar
              className="h-12 w-12 ring-2 ring-white cursor-pointer"
              onClick={() => navigate(`/profile/${thread.user?.username}`)}
            >
              <AvatarImage src={thread.user?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
                {thread.user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!following && (
              <button
                onClick={handleFollow}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={handleLike} className="p-1 transition-transform active:scale-125">
            <Heart className={`h-7 w-7 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          <span className="text-white text-xs font-semibold">{likeCount}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => navigate(`/thread/${thread.id}`)} className="p-1">
            <MessageCircle className="h-7 w-7 text-white" />
          </button>
          <span className="text-white text-xs font-semibold">{thread.replies_count || 0}</span>
        </div>

        {/* Repost */}
        <div className="flex flex-col items-center gap-1">
          <button className="p-1">
            <Repeat2 className={`h-7 w-7 ${thread.is_reposted ? 'text-green-400' : 'text-white'}`} />
          </button>
          <span className="text-white text-xs font-semibold">{thread.reposts_count || 0}</span>
        </div>

        {/* Share */}
        <button onClick={handleShare} className="p-1">
          <Share2 className="h-7 w-7 text-white" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-20 left-0 right-16 px-4 z-20">
        <button
          className="font-bold text-white text-sm mb-1 hover:underline"
          onClick={() => navigate(`/profile/${thread.user?.username}`)}
        >
          @{thread.user?.username}
        </button>
        <p className="text-white/90 text-sm line-clamp-2 leading-relaxed">{thread.content}</p>
        <p className="text-white/50 text-xs mt-1">
          {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function VideoFeedPage() {
  const [videos, setVideos] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    getVideoFeed()
      .then(setVideos)
      .catch(e => toast({ title: 'Error', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  // Snap scroll on touch
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 50) return;
    if (delta > 0 && currentIndex < videos.length - 1) setCurrentIndex(i => i + 1);
    else if (delta < 0 && currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  // Scroll wheel on desktop
  useEffect(() => {
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (locked) return;
      locked = true;
      if (e.deltaY > 0 && currentIndex < videos.length - 1) setCurrentIndex(i => i + 1);
      else if (e.deltaY < 0 && currentIndex > 0) setCurrentIndex(i => i - 1);
      setTimeout(() => { locked = false; }, 700);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [currentIndex, videos.length]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-lg font-medium">No videos yet</p>
        <Button variant="outline" onClick={() => navigate('/')} className="text-white border-white/30">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-50 text-white bg-black/30 hover:bg-black/50 rounded-full h-9 w-9"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Slides container */}
      <div
        className="h-full transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
        style={{ transform: `translateY(-${currentIndex * 100}vh)` }}
      >
        {videos.map((video, index) => (
          <div key={video.id} className="h-screen w-full flex-shrink-0">
            <TikTokVideoSlide
              thread={video}
              isActive={index === currentIndex}
              muted={muted}
              onMuteToggle={() => setMuted(m => !m)}
            />
          </div>
        ))}
      </div>

      {/* Dot progress indicator */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
        {videos.slice(0, 10).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === currentIndex
                ? 'h-6 w-1.5 bg-white'
                : 'h-1.5 w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
