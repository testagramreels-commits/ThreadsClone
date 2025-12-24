import { useState, useEffect } from 'react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { getBookmarkedThreads } from '@/lib/optimizedApi';
import { Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function BookmarksPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBookmarks = async () => {
    try {
      const data = await getBookmarkedThreads();
      setThreads(data);
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

  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b p-4 sticky top-16 glass-effect z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              <h1 className="text-xl font-bold">Bookmarks</h1>
            </div>
          </div>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No bookmarks yet</p>
              <p className="text-sm mt-2">Bookmark threads to find them easily later</p>
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} onUpdate={loadBookmarks} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
