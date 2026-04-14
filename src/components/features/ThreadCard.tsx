import { useState } from 'react';
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal } from 'lucide-react';
import { Thread } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toggleThreadLike, toggleThreadRepost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ThreadContent } from './ThreadContent';
import { BookmarkButton } from './BookmarkButton';
import { QuoteThreadButton } from './QuoteThreadButton';
import { QuotedThreadPreview } from './QuotedThreadPreview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toggleMute, toggleBlock } from '@/lib/optimizedApi';

interface ThreadCardProps {
  thread: Thread;
  isDetailView?: boolean;
  onUpdate?: () => void;
}

export function ThreadCard({ thread, isDetailView = false, onUpdate }: ThreadCardProps) {
  const [isLiked, setIsLiked] = useState(thread.is_liked || false);
  const [likes, setLikes] = useState(thread.likes_count || 0);
  const [isReposted, setIsReposted] = useState(thread.is_reposted || false);
  const [reposts, setReposts] = useState(thread.reposts_count || 0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const liked = await toggleThreadLike(thread.id);
      setIsLiked(liked);
      setLikes(liked ? likes + 1 : likes - 1);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const reposted = await toggleThreadRepost(thread.id);
      setIsReposted(reposted);
      setReposts(reposted ? reposts + 1 : reposts - 1);
      toast({ title: reposted ? 'Reposted!' : 'Unreposted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/thread/${thread.id}`;
    if (navigator.share) {
      navigator.share({ title: `@${thread.user?.username}`, text: thread.content, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  const handleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!thread.user?.id) return;
    try {
      const muted = await toggleMute(thread.user.id);
      toast({ title: muted ? 'User Muted' : 'User Unmuted' });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleBlock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!thread.user?.id) return;
    try {
      const blocked = await toggleBlock(thread.user.id);
      toast({ title: blocked ? 'User Blocked' : 'User Unblocked' });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    if (!isDetailView) navigate(`/thread/${thread.id}`);
  };

  return (
    <article
      className={`p-4 transition-colors animate-fade-in ${!isDetailView ? 'hover:bg-accent/30 cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        <Avatar
          className="h-10 w-10 flex-shrink-0 ring-2 ring-background cursor-pointer"
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${thread.user?.username}`); }}
        >
          <AvatarImage src={thread.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.user?.username}`} />
          <AvatarFallback className="font-bold text-sm bg-gradient-to-br from-primary to-purple-600 text-white">
            {thread.user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className="font-semibold text-sm cursor-pointer hover:underline"
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${thread.user?.username}`); }}
              >
                {thread.user?.username}
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={e => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
                <DropdownMenuItem onClick={handleMute}>Mute @{thread.user?.username}</DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                  Block @{thread.user?.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ThreadContent content={thread.content} />

          {/* Quoted thread preview */}
          {thread.quote_thread_id && (
            <QuotedThreadPreview quoteThreadId={thread.quote_thread_id} />
          )}

          {/* Media */}
          {thread.image_url && (
            <img
              src={thread.image_url}
              alt="Thread image"
              className="rounded-xl w-full max-h-80 object-cover mt-1"
              loading="lazy"
            />
          )}
          {thread.video_url && (
            <video
              src={thread.video_url}
              controls
              preload="metadata"
              className="rounded-xl w-full max-h-80 object-cover mt-1"
            />
          )}

          {/* Action bar */}
          <div className="flex items-center gap-0 pt-0.5 -ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={loading}
              className={`h-8 gap-1.5 px-2 rounded-full text-xs font-medium transition-colors ${
                isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              {likes > 0 && <span>{likes}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigate(`/thread/${thread.id}`); }}
              className="h-8 gap-1.5 px-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {(thread.replies_count || 0) > 0 && <span>{thread.replies_count}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRepost}
              disabled={loading}
              className={`h-8 gap-1.5 px-2 rounded-full text-xs font-medium transition-colors ${
                isReposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'
              }`}
            >
              <Repeat2 className={`h-4 w-4 ${isReposted ? 'fill-current' : ''}`} />
              {reposts > 0 && <span>{reposts}</span>}
            </Button>

            <QuoteThreadButton thread={thread} onSuccess={onUpdate} />

            <BookmarkButton
              threadId={thread.id}
              isBookmarked={thread.is_bookmarked}
              bookmarksCount={thread.bookmarks_count}
              onToggle={onUpdate}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground ml-auto"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
