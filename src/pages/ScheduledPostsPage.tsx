import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Send, Trash2, Loader2, CalendarClock, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/features/BottomNav';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Thread } from '@/types/database';
import { format, formatDistanceToNow, isPast } from 'date-fns';

export function ScheduledPostsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduled, setScheduled] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadScheduled = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*, user:user_profiles(id, username, email, avatar_url)')
        .eq('user_id', user.id)
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      setScheduled((data || []) as Thread[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadScheduled(); }, [loadScheduled]);

  // Auto-refresh countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setScheduled(prev => [...prev]), 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePublishNow = async (thread: Thread) => {
    setPublishing(thread.id);
    try {
      const { error } = await supabase
        .from('threads')
        .update({ scheduled_at: null })
        .eq('id', thread.id);
      if (error) throw error;
      toast({ title: 'Published!', description: 'Your thread is now live.' });
      loadScheduled();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (thread: Thread) => {
    if (!confirm('Delete this scheduled thread?')) return;
    setDeleting(thread.id);
    try {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', thread.id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      setScheduled(prev => prev.filter(t => t.id !== thread.id));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    if (isPast(date)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
          <Clock className="h-2.5 w-2.5" /> Ready to publish
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
        <Clock className="h-2.5 w-2.5" /> {formatDistanceToNow(date, { addSuffix: true })}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-base">Scheduled Posts</h1>
            <p className="text-xs text-muted-foreground">{scheduled.length} post{scheduled.length !== 1 ? 's' : ''} queued</p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28 px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : scheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-lg">No scheduled posts</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use the clock icon when creating a thread to schedule it for later.
              </p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate('/')}>
              Create a Thread
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduled.map(thread => {
              const scheduledAt = thread.scheduled_at!;
              const isOverdue = isPast(new Date(scheduledAt));

              return (
                <div
                  key={thread.id}
                  className={`border rounded-2xl p-4 transition-colors ${
                    isOverdue
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-col gap-1.5">
                      {getStatusBadge(scheduledAt)}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {format(new Date(scheduledAt), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(thread)}
                      disabled={deleting === thread.id}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      {deleting === thread.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <p className="text-sm leading-relaxed text-foreground line-clamp-4 mb-3">
                    {thread.content}
                  </p>

                  {/* Media preview */}
                  {thread.image_url && (
                    <img
                      src={thread.image_url}
                      alt="Scheduled media"
                      className="w-full h-32 object-cover rounded-xl mb-3"
                    />
                  )}
                  {thread.video_url && (
                    <div className="w-full h-32 rounded-xl bg-muted flex items-center justify-center mb-3 relative overflow-hidden">
                      <video src={thread.video_url} className="w-full h-full object-cover" muted preload="none" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">Video</span>
                      </div>
                    </div>
                  )}

                  {/* Flags */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {thread.is_exclusive && (
                      <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        🔒 Exclusive
                      </span>
                    )}
                    {thread.media_type === 'poll' && (
                      <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        📊 Poll
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <Button
                    size="sm"
                    className="w-full rounded-xl gap-1.5 h-9 text-xs font-semibold"
                    onClick={() => handlePublishNow(thread)}
                    disabled={publishing === thread.id}
                    variant={isOverdue ? 'default' : 'outline'}
                  >
                    {publishing === thread.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Publish Now
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
