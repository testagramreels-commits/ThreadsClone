import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, Repeat2, Volume2, VolumeX, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getVideoFeed, toggleThreadLike, toggleFollow } from '@/lib/api';
import { Thread } from '@/types/database';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

// Preload next video
function preloadVideo(url: string) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = url;
  document.head.appendChild(link);
}

function TikTokVideoSlide({
  thread,
  isActive,
  isPrev,
  isNext,
  muted,
  onMuteToggle,
}: {
  thread: Thread;
  isActive: boolean;
  isPrev: boolean;
  isNext: boolean;
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
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);

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

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress((vid.currentTime / vid.duration) * 100);
    if (vid.buffered.length > 0) {
      setBuffered((vid.buffered.end(vid.buffered.length - 1) / vid.duration) * 100);
    }
  };

  const handleTap = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) { vid.play(); setPaused(false); }
    else { vid.pause(); setPaused(true); }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    vid.currentTime = pct * vid.duration;
  };

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    try {
      await toggleThreadLike(thread.id);
    } catch {
      setLiked(!newLiked);
      setLikeCount(c => newLiked ? c - 1 : c + 1);
    }
  };

  const handleFollow = async () => {
    if (!user || !thread.user?.id) return;
    try {
      const result = await toggleFollow(thread.user.id);
      setFollowing(result);
      toast({ title: result ? 'Following!' : 'Unfollowed', description: `@${thread.user.username}` });
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
      {/* Video with preload for adjacent videos */}
      <video
        ref={videoRef}
        src={thread.video_url || ''}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        onClick={handleTap}
        onTimeUpdate={handleTimeUpdate}
        preload={isActive || isPrev || isNext ? 'auto' : 'none'}
      />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Pause indicator */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-5">
            <Play className="w-12 h-12 text-white fill-current" />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-pointer z-30"
        onClick={handleProgressClick}
      >
        <div className="h-full bg-white/20">
          <div className="h-full bg-white/40 transition-none" style={{ width: `${buffered}%` }} />
          <div className="h-full bg-white absolute top-0 left-0 transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Mute button */}
      <button
        onClick={onMuteToggle}
        className="absolute top-6 right-4 z-20 bg-black/40 backdrop-blur-sm rounded-full p-2.5"
      >
        {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
      </button>

      {/* Right action bar */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
        {/* Avatar */}
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
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs shadow-lg hover:bg-red-600"
            >
              +
            </button>
          )}
        </div>

        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={handleLike} className="p-1 transition-transform active:scale-125">
            <Heart className={`h-7 w-7 ${liked ? 'fill-red-500 text-red-500' : 'text-white drop-shadow-sm'}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-sm">{likeCount.toLocaleString()}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => navigate(`/thread/${thread.id}`)} className="p-1">
            <MessageCircle className="h-7 w-7 text-white drop-shadow-sm" />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-sm">{thread.replies_count || 0}</span>
        </div>

        {/* Repost */}
        <div className="flex flex-col items-center gap-1">
          <button className="p-1">
            <Repeat2 className={`h-7 w-7 ${thread.is_reposted ? 'text-green-400' : 'text-white drop-shadow-sm'}`} />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-sm">{thread.reposts_count || 0}</span>
        </div>

        {/* Share */}
        <button onClick={handleShare} className="p-1">
          <Share2 className="h-7 w-7 text-white drop-shadow-sm" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-20 left-0 right-16 px-4 z-20">
        <button
          className="font-bold text-white text-sm mb-1.5 hover:opacity-80 transition-opacity block"
          onClick={() => navigate(`/profile/${thread.user?.username}`)}
        >
          @{thread.user?.username}
        </button>
        {thread.content && (
          <p className="text-white/90 text-sm line-clamp-2 leading-relaxed drop-shadow-sm">{thread.content}</p>
        )}
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
  const touchStartY = useRef(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    getVideoFeed()
      .then(v => {
        setVideos(v);
        // Preload first 2 videos
        v.slice(0, 2).forEach(vid => { if (vid.video_url) preloadVideo(vid.video_url); });
      })
      .catch(e => toast({ title: 'Error', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  // Preload adjacent when index changes
  useEffect(() => {
    const next = videos[currentIndex + 1];
    const afterNext = videos[currentIndex + 2];
    if (next?.video_url) preloadVideo(next.video_url);
    if (afterNext?.video_url) preloadVideo(afterNext.video_url);
  }, [currentIndex, videos]);

  const goNext = useCallback(() => {
    if (currentIndex < videos.length - 1) setCurrentIndex(i => i + 1);
  }, [currentIndex, videos.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) goNext();
    else goPrev();
  };

  useEffect(() => {
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (locked) return;
      locked = true;
      if (e.deltaY > 0) goNext();
      else goPrev();
      setTimeout(() => { locked = false; }, 600);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
        <p className="text-white/60 text-sm">Loading videos...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-4xl">🎬</span>
        </div>
        <p className="text-lg font-bold">No videos yet</p>
        <p className="text-white/50 text-sm">Be the first to post a video!</p>
        <Button variant="outline" onClick={() => navigate('/')} className="text-white border-white/30 mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  return (
    <div
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
              isPrev={index === currentIndex - 1}
              isNext={index === currentIndex + 1}
              muted={muted}
              onMuteToggle={() => setMuted(m => !m)}
            />
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
        {videos.slice(0, Math.min(videos.length, 10)).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === currentIndex ? 'h-6 w-1.5 bg-white' : 'h-1.5 w-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 bg-black/30 rounded-full px-3 py-1 text-white text-xs font-semibold">
        {currentIndex + 1} / {videos.length}
      </div>
    </div>
  );
}
