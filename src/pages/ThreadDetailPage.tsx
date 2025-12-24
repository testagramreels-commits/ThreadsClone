import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { ReplyCard } from '@/components/features/ReplyCard';
import { CreateReply } from '@/components/features/CreateReply';
import { getThreadById, getThreadReplies } from '@/lib/api';
import { Thread, ThreadReply } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function ThreadDetailPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThread();
  }, [threadId]);

  const loadThread = async () => {
    if (!threadId) return;

    try {
      const [threadData, repliesData] = await Promise.all([
        getThreadById(threadId),
        getThreadReplies(threadId),
      ]);
      setThread(threadData);
      setReplies(repliesData);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Thread not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b p-4 sticky top-16 glass-effect z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <ThreadCard thread={thread} isDetailView />

        <div className="border-t p-4">
          <CreateReply threadId={thread.id} onReplyCreated={loadThread} />
        </div>

        <div className="border-t">
          {replies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No replies yet. Be the first to reply!</p>
            </div>
          ) : (
            <div className="divide-y">
              {replies.map((reply) => (
                <ReplyCard key={reply.id} reply={reply} onUpdate={loadThread} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
