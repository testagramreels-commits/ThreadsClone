import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { CreateThread } from '@/components/features/CreateThread';
import { ThreadCard } from '@/components/features/ThreadCard';
import { BottomNav } from '@/components/features/BottomNav';
import { getThreads } from '@/lib/api';
import { Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function HomePage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadThreads = async () => {
    try {
      const data = await getThreads();
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
    loadThreads();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <CreateThread onThreadCreated={loadThreads} />
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No threads yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="divide-y">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
