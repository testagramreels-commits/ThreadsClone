import { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from 'lucide-react';
import { ThreadReply } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ThreadContent } from './ThreadContent';
import { toggleReplyLike, createReplyToReply } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface ReplyCardProps {
  reply: ThreadReply;
  onUpdate?: () => void;
}

export function ReplyCard({ reply, onUpdate }: ReplyCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(reply.is_liked || false);
  const [likes, setLikes] = useState(reply.likes_count || 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const liked = await toggleReplyLike(reply.id);
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

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    
    setLoading(true);
    try {
      await createReplyToReply(reply.id, replyContent);
      toast({
        title: 'Success',
        description: 'Reply posted!',
      });
      setReplyContent('');
      setShowReplyInput(false);
      onUpdate?.();
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
    <article className="p-4 hover:bg-accent/50 transition-colors animate-fade-in border-l-2 border-muted ml-4">
      <div className="flex gap-3">
        <Avatar 
          className="h-10 w-10 ring-2 ring-background cursor-pointer flex-shrink-0"
          onClick={() => navigate(`/profile/${reply.user?.username}`)}
        >
          <AvatarImage src={reply.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.user?.username}`} />
          <AvatarFallback>{reply.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span 
                className="font-semibold text-sm cursor-pointer hover:underline truncate"
                onClick={() => navigate(`/profile/${reply.user?.username}`)}
              >
                {reply.user?.username}
              </span>
              <span className="text-muted-foreground text-sm truncate">@{reply.user?.username}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
              </span>
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <ThreadContent content={reply.content} />

          <div className="flex items-center gap-1 pt-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={loading}
              className={`gap-2 hover:text-red-500 transition-colors ${
                isLiked ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{likes}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{reply.replies_count || 0}</span>
            </Button>
          </div>

          {showReplyInput && (
            <div className="pt-2 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows={2}
                disabled={loading}
                className="resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyContent('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={loading || !replyContent.trim()}
                >
                  {loading ? 'Posting...' : 'Reply'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
