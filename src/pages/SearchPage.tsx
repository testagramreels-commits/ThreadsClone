import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, TrendingUp, User, Hash, Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/features/BottomNav';
import { ThreadCard } from '@/components/features/ThreadCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { searchThreads, getTrendingHashtags, getSuggestedUsers } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Thread, TrendingHashtag, UserWithStats } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';

interface AutocompleteResult {
  users: { id: string; username: string; avatar_url?: string; bio?: string }[];
  hashtags: string[];
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Thread[]>([]);
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserWithStats[]>([]);
  const [autocomplete, setAutocomplete] = useState<AutocompleteResult>({ users: [], hashtags: [] });
  const [loading, setLoading] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteDebounce = useRef<ReturnType<typeof setTimeout>>();
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    loadTrending();
    loadSuggestedUsers();
    const q = searchParams.get('q');
    if (q) { setQuery(q); handleSearch(q); }
  }, []);

  const loadTrending = async () => {
    try { setTrending(await getTrendingHashtags()); } catch { /* ignore */ }
  };

  const loadSuggestedUsers = async () => {
    try { setSuggestedUsers(await getSuggestedUsers()); } catch { /* ignore */ }
  };

  const handleSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setShowAutocomplete(false);
    try {
      const data = await searchThreads(q);
      setResults(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const fetchAutocomplete = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setAutocomplete({ users: [], hashtags: [] }); return; }
    setAutocompleteLoading(true);
    try {
      const [usersRes, threadsRes] = await Promise.all([
        supabase.from('user_profiles').select('id,username,avatar_url,bio').ilike('username', `%${q}%`).limit(5),
        supabase.from('threads').select('content').ilike('content', `%#${q}%`).limit(100),
      ]);

      const users = usersRes.data ?? [];
      const counts: Record<string, number> = {};
      const regex = new RegExp(`#(${q}\\w*)`, 'gi');
      (threadsRes.data ?? []).forEach((t) => {
        let m;
        while ((m = regex.exec(t.content)) !== null) {
          const tag = m[1].toLowerCase();
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
      });
      const hashtags = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([tag]) => `#${tag}`);

      setAutocomplete({ users, hashtags });
      setShowAutocomplete(users.length > 0 || hashtags.length > 0);
    } catch { /* ignore */ }
    finally { setAutocompleteLoading(false); }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) { setShowAutocomplete(false); setResults([]); return; }

    clearTimeout(autocompleteDebounce.current);
    clearTimeout(searchDebounce.current);
    autocompleteDebounce.current = setTimeout(() => fetchAutocomplete(val), 250);
    searchDebounce.current = setTimeout(() => handleSearch(val), 600);
  };

  const selectSuggestion = (q: string) => {
    setQuery(q);
    setShowAutocomplete(false);
    setSearchParams({ q });
    handleSearch(q);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowAutocomplete(false);
    setSearchParams({});
    inputRef.current?.focus();
  };

  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto pb-24">
        {/* Search bar */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length >= 2 && setShowAutocomplete(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { clearTimeout(searchDebounce.current); handleSearch(query); setShowAutocomplete(false); }
                if (e.key === 'Escape') { setShowAutocomplete(false); }
              }}
              placeholder="Search threads, users, #hashtags…"
              className="w-full h-10 pl-9 pr-10 rounded-full bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Autocomplete dropdown */}
            {showAutocomplete && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                {autocompleteLoading && (
                  <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                  </div>
                )}

                {autocomplete.users.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Users</p>
                    {autocomplete.users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => selectSuggestion(`@${u.username}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={u.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} />
                          <AvatarFallback className="text-xs">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">@{u.username}</p>
                          {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
                        </div>
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {autocomplete.hashtags.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hashtags</p>
                    {autocomplete.hashtags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => selectSuggestion(tag)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Hash className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-primary">{tag}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Empty state: trending + suggested users */}
        {!isSearching && (
          <div>
            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <div className="px-4 pt-5 pb-3">
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Who to follow
                </h2>
                <div className="space-y-3">
                  {suggestedUsers.slice(0, 5).map(u => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/profile/${u.username}`)}
                      className="w-full flex items-center gap-3 text-left hover:bg-accent rounded-xl p-2 -mx-2 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} />
                        <AvatarFallback className="font-bold">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">@{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.followers_count || 0} followers · {u.threads_count || 0} threads</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Hashtags */}
            {trending.length > 0 && (
              <div className="px-4 pt-4 pb-3 border-t border-border/60">
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Trending
                </h2>
                <div className="space-y-0">
                  {trending.map((item, index) => (
                    <button
                      key={item.hashtag}
                      onClick={() => selectSuggestion(item.hashtag)}
                      className="w-full flex items-center justify-between py-3 border-b border-border/40 last:border-0 hover:bg-accent rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">#{index + 1} · Trending</p>
                        <p className="font-bold text-sm text-primary">{item.hashtag}</p>
                        <p className="text-xs text-muted-foreground">{item.count} {item.count === 1 ? 'thread' : 'threads'}</p>
                      </div>
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {isSearching && (
          <div className="divide-y divide-border/60">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No results for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords or hashtags</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/50 font-medium">
                  {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                </div>
                {results.map(thread => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
