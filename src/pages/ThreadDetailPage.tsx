import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Loader2, Image as ImageIcon, Video, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { ReplyCard } from '@/components/features/ReplyCard';
import { getThreadById, getThreadReplies, uploadImage, uploadVideo } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Thread, ThreadReply } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 20;

export function ThreadDetailPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reply composer state
  const [replyContent, setReplyContent] = useState('');
  const [replyMedia, setReplyMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadThread(); }, [threadId]);

  const loadThread = async () => {
    if (!threadId) return;
    try {
      const [threadData, repliesData] = await Promise.all([
        getThreadById(threadId),
        loadRepliesPage(0),
      ]);
      setThread(threadData);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadRepliesPage = async (currentOffset: number, append = false) => {
    if (!threadId) return [];
    const { data, error } = await supabase
      .from('thread_replies')
      .select('*, user:user_profiles(id, username, email, avatar_url)')
      .eq('thread_id', threadId)
      .is('parent_reply_id', null) // top-level only
      .order('created_at', { ascending: true })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (error) throw error;
    const fetched = (data || []) as ThreadReply[];
    setHasMore(fetched.length === PAGE_SIZE);

    if (append) {
      setReplies(prev => [...prev, ...fetched]);
    } else {
      setReplies(fetched);
    }
    return fetched;
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = offset + PAGE_SIZE;
    await loadRepliesPage(next, true);
    setOffset(next);
    setLoadingMore(false);
  }, [loadingMore, hasMore, offset, threadId]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1, rootMargin: '200px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setReplyMedia({ file, preview: reader.result as string, type });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmitReply = async () => {
    if (!user || !threadId || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      if (replyMedia) {
        if (replyMedia.type === 'video') {
          videoUrl = await uploadVideo(replyMedia.file);
        } else {
          imageUrl = await uploadImage(replyMedia.file, 'thread-images');
        }
      }

      const insertData: any = {
        thread_id: threadId,
        user_id: user.id,
        content: replyContent.trim(),
      };
      if (replyTo) insertData.parent_reply_id = replyTo.id;
      if (imageUrl) insertData.image_url = imageUrl;

      const { data, error } = await supabase
        .from('thread_replies')
        .insert(insertData)
        .select('*, user:user_profiles(id, username, email, avatar_url)')
        .single();

      if (error) throw error;

      // Optimistic update: add to list
      if (!replyTo) {
        setReplies(prev => [...prev, data as ThreadReply]);
      }

      setReplyContent('');
      setReplyMedia(null);
      setReplyTo(null);

      // Update reply count
      if (thread) setThread({ ...thread, replies_count: (thread.replies_count || 0) + 1 });

      toast({ title: 'Reply posted!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold">Thread</h1>
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <MessageCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">Thread not found</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold">Thread</h1>
          <span className="text-sm text-muted-foreground ml-auto">{(thread.replies_count || 0).toLocaleString()} replies</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-32">
        <ThreadCard thread={thread} isDetailView onUpdate={loadThread} />

        {/* Reply composer */}
        {user && (
          <div className="sticky bottom-16 z-30 bg-background/95 backdrop-blur-md border-t border-border/60 px-4 py-3">
            {replyTo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>Replying to @{replyTo.username}</span>
                <button onClick={() => setReplyTo(null)} className="text-primary">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-start">
              <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
                  {user.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {replyMedia && (
                  <div className="relative w-20 h-14 mb-1 rounded-lg overflow-hidden group">
                    {replyMedia.type === 'video' ? (
                      <video src={replyMedia.preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={replyMedia.preview} alt="media" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => setReplyMedia(null)}
                      className="absolute top-0.5 right-0.5 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); } }}
                    placeholder={replyTo ? `Reply to @${replyTo.username}...` : 'Post a reply...'}
                    className="flex-1 bg-muted/50 rounded-full px-3 py-2 text-sm outline-none focus:ring-1 ring-primary"
                    maxLength={500}
                  />
                  <button
                    onClick={() => imageRef.current?.click()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => videoRef.current?.click()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <Button
                    size="icon"
                    className="h-9 w-9 rounded-full flex-shrink-0"
                    onClick={handleSubmitReply}
                    disabled={submitting || !replyContent.trim()}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => handleMediaSelect(e, 'image')} />
              <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleMediaSelect(e, 'video')} />
            </div>
          </div>
        )}

        {/* Replies */}
        <div className="border-t border-border/60">
          {replies.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <MessageCircle className="h-12 w-12" />
              <p className="font-medium">No replies yet</p>
              <p className="text-sm">Be the first to reply!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {replies.map(reply => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  onReply={(id, username) => setReplyTo({ id, username })}
                  onUpdate={() => loadRepliesPage(0, false)}
                />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="py-4 flex justify-center">
            {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && replies.length > 0 && (
              <p className="text-xs text-muted-foreground">All replies loaded</p>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
