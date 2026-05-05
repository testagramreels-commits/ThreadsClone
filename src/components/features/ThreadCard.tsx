import { useState } from 'react';
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, Trash2, Edit3, BadgeCheck, Lock } from 'lucide-react';
import { Thread } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toggleThreadLike, toggleThreadRepost } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ThreadContent } from './ThreadContent';
import { BookmarkButton } from './BookmarkButton';
import { QuoteThreadButton } from './QuoteThreadButton';
import { QuotedThreadPreview } from './QuotedThreadPreview';
import { PollDisplay } from './PollDisplay';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toggleMute, toggleBlock } from '@/lib/optimizedApi';
import { useAuth } from '@/hooks/useAuth';

interface ThreadCardProps {
  thread: Thread;
  isDetailView?: boolean;
  onUpdate?: () => void;
}

export function ThreadCard({ thread, isDetailView = false, onUpdate }: ThreadCardProps) {
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(thread.is_liked || false);
  const [likes, setLikes] = useState(thread.likes_count || 0);
  const [isReposted, setIsReposted] = useState(thread.is_reposted || false);
  const [reposts, setReposts] = useState(thread.reposts_count || 0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(thread.content);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isOwn = currentUser?.id === thread.user_id;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    // Optimistic update
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikes(newLiked ? likes + 1 : Math.max(0, likes - 1));
    try {
      await toggleThreadLike(thread.id);
    } catch (error: any) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikes(newLiked ? likes - 1 : likes + 1);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const newReposted = !isReposted;
    setIsReposted(newReposted);
    setReposts(newReposted ? reposts + 1 : Math.max(0, reposts - 1));
    try {
      await toggleThreadRepost(thread.id);
      toast({ title: newReposted ? 'Reposted!' : 'Unreposted' });
    } catch (error: any) {
      setIsReposted(!newReposted);
      setReposts(newReposted ? reposts - 1 : reposts + 1);
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this thread?')) return;
    try {
      const { error } = await supabase.from('threads').delete().eq('id', thread.id);
      if (error) throw error;
      setDeleted(true);
      toast({ title: 'Thread deleted' });
      onUpdate?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('threads').update({ content: editContent, updated_at: new Date().toISOString() }).eq('id', thread.id);
      if (error) throw error;
      setEditing(false);
      toast({ title: 'Thread updated!' });
      onUpdate?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
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
    if (target.closest('button') || target.closest('a') || target.closest('textarea')) return;
    if (!isDetailView) navigate(`/thread/${thread.id}`);
  };

  if (deleted) return null;

  return (
    <article
      className={`p-4 transition-colors ${!isDetailView ? 'hover:bg-accent/30 cursor-pointer' : ''}`}
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
                className="font-semibold text-sm cursor-pointer hover:underline flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${thread.user?.username}`); }}
              >
                {thread.user?.username}
                {(thread.user as any)?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </span>
              {thread.updated_at !== thread.created_at && (
                <span className="text-muted-foreground text-xs">(edited)</span>
              )}
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
                {isOwn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Thread
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Thread
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleMute}>Mute @{thread.user?.username}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                      Block @{thread.user?.username}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Exclusive badge */}
          {thread.is_exclusive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl w-fit">
              <Lock className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Exclusive · Subscribers only</span>
            </div>
          )}

          {/* Content */}
          {editing ? (
            <div onClick={e => e.stopPropagation()}>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full text-sm border border-border/60 rounded-xl p-2 bg-background resize-none focus:outline-none focus:border-primary"
                rows={3}
                maxLength={500}
              />
              <div className="flex gap-2 mt-1">
                <Button size="sm" className="rounded-full text-xs h-7 px-3" onClick={handleEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-xs h-7 px-3" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <ThreadContent content={thread.content} />
          )}

          {/* Quoted thread */}
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
              className="rounded-xl w-full max-h-96 object-cover mt-1"
              playsInline
            />
          )}

          {/* Poll display - look for associated poll */}
          {thread.poll_id && <PollDisplay pollId={thread.poll_id} />}

          {/* Action bar */}
          <div className="flex items-center gap-0 pt-0.5 -ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`h-8 gap-1.5 px-2 rounded-full text-xs font-medium transition-all active:scale-90 ${
                isLiked ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
              }`}
            >
              <Heart className={`h-4 w-4 transition-transform ${isLiked ? 'fill-current scale-110' : ''}`} />
              {likes > 0 && <span>{likes.toLocaleString()}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigate(`/thread/${thread.id}`); }}
              className="h-8 gap-1.5 px-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {(thread.replies_count || 0) > 0 && <span>{thread.replies_count?.toLocaleString()}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRepost}
              className={`h-8 gap-1.5 px-2 rounded-full text-xs font-medium transition-all active:scale-90 ${
                isReposted ? 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30' : 'text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'
              }`}
            >
              <Repeat2 className={`h-4 w-4 ${isReposted ? 'fill-current' : ''}`} />
              {reposts > 0 && <span>{reposts.toLocaleString()}</span>}
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
