import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from 'lucide-react';
import { Thread } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toggleThreadLike, toggleThreadRepost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ThreadContent } from './ThreadContent';

interface VideoCardProps {
  thread: Thread;
  isActive: boolean;
}

export function VideoCard({ thread, isActive }: VideoCardProps) {
  const [isLiked, setIsLiked] = useState(thread.is_liked || false);
  const [likes, setLikes] = useState(thread.likes_count || 0);
  const [isReposted, setIsReposted] = useState(thread.is_reposted || false);
  const [reposts, setReposts] = useState(thread.reposts_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const liked = await toggleThreadLike(thread.id);
      setIsLiked(liked);
      setLikes(liked ? likes + 1 : likes - 1);
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

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const reposted = await toggleThreadRepost(thread.id);
      setIsReposted(reposted);
      setReposts(reposted ? reposts + 1 : reposts - 1);
      toast({
        title: reposted ? 'Reposted!' : 'Unreposted',
        description: reposted ? 'Video reposted to your profile' : 'Video removed from your reposts',
      });
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

  return (
    <div className="relative h-screen w-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={thread.video_url}
        className="h-full w-full object-contain"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* Video Controls */}
      <button
        onClick={togglePlay}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      >
        {isPlaying ? (
          <Pause className="h-10 w-10 text-white" />
        ) : (
          <Play className="h-10 w-10 text-white ml-2" />
        )}
      </button>

      <button
        onClick={toggleMute}
        className="absolute bottom-24 left-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>

      {/* User Info & Actions */}
      <div className="absolute bottom-24 left-4 right-20 text-white">
        <div 
          className="flex items-center gap-3 mb-3 cursor-pointer"
          onClick={() => navigate(`/profile/${thread.user?.username}`)}
        >
          <Avatar className="h-12 w-12 ring-2 ring-white">
            <AvatarImage src={thread.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.user?.username}`} />
            <AvatarFallback>{thread.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-lg">{thread.user?.username}</p>
            <p className="text-sm text-white/80">
              {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <ThreadContent content={thread.content} className="text-white mb-2" />
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLike}
          disabled={loading}
          className={`h-14 w-14 rounded-full bg-black/50 hover:bg-black/70 ${
            isLiked ? 'text-red-500' : 'text-white'
          }`}
        >
          <div className="flex flex-col items-center">
            <Heart className={`h-7 w-7 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs mt-1">{likes}</span>
          </div>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/thread/${thread.id}`)}
          className="h-14 w-14 rounded-full bg-black/50 hover:bg-black/70 text-white"
        >
          <div className="flex flex-col items-center">
            <MessageCircle className="h-7 w-7" />
            <span className="text-xs mt-1">{thread.replies_count || 0}</span>
          </div>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRepost}
          disabled={loading}
          className={`h-14 w-14 rounded-full bg-black/50 hover:bg-black/70 ${
            isReposted ? 'text-green-500' : 'text-white'
          }`}
        >
          <div className="flex flex-col items-center">
            <Repeat2 className={`h-7 w-7 ${isReposted ? 'fill-current' : ''}`} />
            <span className="text-xs mt-1">{reposts}</span>
          </div>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-14 w-14 rounded-full bg-black/50 hover:bg-black/70 text-white"
        >
          <Send className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}
