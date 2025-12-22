import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { searchThreads, getTrendingHashtags } from '@/lib/api';
import { Thread, TrendingHashtag } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Thread[]>([]);
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    loadTrending();
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      handleSearch(q);
    }
  }, [searchParams]);

  const loadTrending = async () => {
    try {
      const data = await getTrendingHashtags();
      setTrending(data);
    } catch (error: any) {
      console.error('Failed to load trending hashtags:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await searchThreads(q);
      setResults(data);
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b p-4 sticky top-16 glass-effect z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search threads, hashtags, or @mentions"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {!query && trending.length > 0 && (
          <div className="border-b p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg">Trending Hashtags</h2>
            </div>
            <div className="space-y-3">
              {trending.map((item, index) => (
                <button
                  key={item.hashtag}
                  onClick={() => {
                    setQuery(item.hashtag);
                    setSearchParams({ q: item.hashtag });
                    handleSearch(item.hashtag);
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">#{index + 1} · Trending</p>
                      <p className="font-semibold text-primary">{item.hashtag}</p>
                      <p className="text-sm text-muted-foreground">{item.count} {item.count === 1 ? 'thread' : 'threads'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : query && results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No results found for "{query}"</p>
            </div>
          ) : query ? (
            results.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))
          ) : null}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
