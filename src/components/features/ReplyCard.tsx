import { useState } from 'react';
import { Heart, MoreHorizontal, Reply, Trash2, Image as ImageIcon, Video } from 'lucide-react';
import { ThreadReply } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ThreadContent } from './ThreadContent';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface ReplyCardProps {
  reply: ThreadReply;
  depth?: number;
  onReply?: (replyId: string, username: string) => void;
  onUpdate?: () => void;
}

export function ReplyCard({ reply, depth = 0, onReply, onUpdate }: ReplyCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(reply.is_liked || false);
  const [likeCount, setLikeCount] = useState(reply.likes_count || 0);
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [saving, setSaving] = useState(false);

  const isOwn = user?.id === reply.user_id;

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    try {
      const { data: existing } = await supabase
        .from('reply_likes')
        .select('id')
        .eq('reply_id', reply.id)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('reply_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('reply_likes').insert({ reply_id: reply.id, user_id: user?.id });
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount(c => newLiked ? c - 1 : c + 1);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this reply?')) return;
    try {
      await supabase.from('thread_replies').delete().eq('id', reply.id);
      setDeleted(true);
      toast({ title: 'Reply deleted' });
      onUpdate?.();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await supabase.from('thread_replies').update({ content: editContent, updated_at: new Date().toISOString() }).eq('id', reply.id);
      setEditing(false);
      toast({ title: 'Reply updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (deleted) return null;

  const maxDepth = 4;
  const indentPx = Math.min(depth * 16, maxDepth * 16);

  return (
    <article
      className="px-4 py-3 hover:bg-accent/20 transition-colors animate-fade-in"
      style={{ paddingLeft: `${16 + indentPx}px` }}
    >
      <div className="flex gap-2.5">
        {/* Thread line for depth */}
        {depth > 0 && (
          <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 2, marginRight: 8 }}>
            <div className="w-0.5 h-full bg-border/60 rounded" />
          </div>
        )}

        <Avatar
          className="h-8 w-8 flex-shrink-0 cursor-pointer"
          onClick={() => navigate(`/profile/${reply.user?.username}`)}
        >
          <AvatarImage src={reply.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.user?.username}`} />
          <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
            {reply.user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className="font-semibold text-sm cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${reply.user?.username}`)}
              >
                {reply.user?.username}
              </span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
              </span>
              {reply.updated_at !== reply.created_at && (
                <span className="text-muted-foreground text-xs">(edited)</span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground rounded-full">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwn && (
                  <>
                    <DropdownMenuItem onClick={() => setEditing(true)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwn && (
                  <DropdownMenuItem onClick={() => navigate(`/profile/${reply.user?.username}`)}>
                    View Profile
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Editing */}
          {editing ? (
            <div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full text-sm border border-border/60 rounded-xl p-2 bg-background resize-none focus:outline-none focus:border-primary"
                rows={2}
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
            <ThreadContent content={reply.content} />
          )}

          {/* Image */}
          {(reply as any).image_url && (
            <img
              src={(reply as any).image_url}
              alt="Reply media"
              className="rounded-xl w-full max-h-48 object-cover mt-1"
              loading="lazy"
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-0 -ml-1.5 pt-0.5">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 h-7 px-1.5 rounded-full text-xs font-medium transition-all active:scale-90 ${
                liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {onReply && depth < 4 && (
              <button
                onClick={() => onReply(reply.id, reply.user?.username || '')}
                className="flex items-center gap-1 h-7 px-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
