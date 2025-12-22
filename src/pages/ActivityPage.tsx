import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { getUserLikedThreads } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function ActivityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [likedThreads, setLikedThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLikedThreads();
  }, []);

  const loadLikedThreads = async () => {
    if (!user) return;

    try {
      const data = await getUserLikedThreads(user.id);
      setLikedThreads(data);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b p-4 sticky top-16 glass-effect z-10 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-current" />
            <h1 className="text-xl font-bold">Liked Threads</h1>
          </div>
        </div>

        <div className="divide-y">
          {likedThreads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No liked threads yet</p>
            </div>
          ) : (
            likedThreads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
