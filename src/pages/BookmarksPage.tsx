import { useState, useEffect } from 'react';
import { ArrowLeft, Bookmark, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { getBookmarkedThreads } from '@/lib/optimizedApi';
import { Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';

type FilterType = 'all' | 'images' | 'videos' | 'text';

export function BookmarksPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const data = await getBookmarkedThreads();
      setThreads(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBookmarks(); }, []);

  const filtered = threads.filter(t => {
    if (filter === 'images') return !!t.image_url;
    if (filter === 'videos') return !!t.video_url;
    if (filter === 'text') return !t.image_url && !t.video_url;
    return true;
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Text', value: 'text' },
    { label: 'Images', value: 'images' },
    { label: 'Videos', value: 'videos' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto pb-24">
        {/* Sticky header */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="flex items-center gap-3 px-4 h-14">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Bookmark className="h-5 w-5" />
            <h1 className="text-lg font-bold flex-1">Bookmarks</h1>
            {threads.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {threads.length}
              </span>
            )}
          </div>

          {/* Filter tabs */}
          {threads.length > 0 && (
            <div className="flex px-4 pb-2 gap-2">
              {filters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filter === f.value
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-bold text-lg mb-1">No bookmarks yet</p>
            <p className="text-sm text-muted-foreground mb-6">Save threads to find them easily later.</p>
            <Button onClick={() => navigate('/')} className="rounded-full">
              Explore threads
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No {filter} bookmarks found</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map(thread => (
              <ThreadCard key={thread.id} thread={thread} onUpdate={loadBookmarks} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
