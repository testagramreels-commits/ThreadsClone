import { supabase } from './supabase';
import { Thread } from '@/types/database';
import { getThreads } from './api';
import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Optimized API using database views for much faster loading
 * This eliminates N+1 query problems
 */

interface ThreadWithStats {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  media_type: string;
  quote_thread_id: string | null;
  created_at: string;
  updated_at: string;
  username: string;
  user_email: string;
  user_avatar_url: string | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  bookmarks_count: number;
  is_liked: boolean;
  is_reposted: boolean;
  is_bookmarked: boolean;
}

function mapThread(t: ThreadWithStats): Thread {
  return {
    id: t.id,
    user_id: t.user_id,
    content: t.content,
    image_url: t.image_url || undefined,
    video_url: t.video_url || undefined,
    media_type: t.media_type as 'text' | 'image' | 'video',
    quote_thread_id: t.quote_thread_id || undefined,
    created_at: t.created_at,
    updated_at: t.updated_at,
    user: {
      id: t.user_id,
      username: t.username,
      email: t.user_email,
      avatar_url: t.user_avatar_url || undefined,
    },
    likes_count: Number(t.likes_count),
    replies_count: Number(t.replies_count),
    reposts_count: Number(t.reposts_count),
    bookmarks_count: Number(t.bookmarks_count),
    is_liked: t.is_liked,
    is_reposted: t.is_reposted,
    is_bookmarked: t.is_bookmarked,
  };
}

export async function getThreadsOptimized(
  limit: number = 20,
  offset: number = 0,
  mediaType?: 'text' | 'image' | 'video',
  followingOnly: boolean = false
): Promise<Thread[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Try Edge Function first for best performance (cached at edge)
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        ...(mediaType ? { media_type: mediaType } : {}),
        ...(followingOnly ? { following_only: 'true' } : {}),
      });

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feed?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.data) return (json.data as ThreadWithStats[]).map(mapThread);
      }
    } catch (edgeErr) {
      console.warn('Edge function unavailable, falling back to RPC:', edgeErr);
    }

    // Fallback: direct RPC
    const { data, error } = await supabase
      .rpc('get_threads_with_stats', {
        p_user_id: user?.id || null,
        p_limit: limit,
        p_offset: offset,
        p_media_type: mediaType || null,
        p_following_only: followingOnly,
      });

    if (error) {
      console.error('RPC error:', error);
      return await getThreads();
    }

    return (data as ThreadWithStats[] || []).map(mapThread);
  } catch (error) {
    console.error('Error in getThreadsOptimized:', error);
    return await getThreads();
  }
}

export async function getMixedFeed(limit: number = 20, offset: number = 0): Promise<Thread[]> {
  try {
    return await getThreadsOptimized(limit, offset, undefined, false);
  } catch (error) {
    console.error('Error in getMixedFeed:', error);
    return await getThreads();
  }
}

// Bookmark functions
export async function toggleBookmark(threadId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in');

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('bookmarks').insert({ thread_id: threadId, user_id: user.id });
    return true;
  }
}

export async function getBookmarkedThreads(): Promise<Thread[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('thread_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!bookmarks || bookmarks.length === 0) return [];

  const threadIds = bookmarks.map(b => b.thread_id);

  const { data, error } = await supabase
    .rpc('get_threads_with_stats', {
      p_user_id: user.id,
      p_limit: 100,
      p_offset: 0,
      p_media_type: null,
      p_following_only: false,
    });

  if (error || !data) return [];

  const bookmarkedThreads = (data as ThreadWithStats[])
    .filter((t: ThreadWithStats) => threadIds.includes(t.id))
    .map(mapThread);

  // Maintain original bookmark order
  const ordered = threadIds
    .map(id => bookmarkedThreads.find(t => t.id === id))
    .filter(Boolean) as Thread[];

  return ordered;
}

// Mute/Block functions
export async function toggleMute(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in');

  const { data: existing } = await supabase
    .from('muted_users')
    .select('id')
    .eq('muted_user_id', userId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('muted_users').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('muted_users').insert({ muted_user_id: userId, user_id: user.id });
    return true;
  }
}

export async function toggleBlock(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in');

  const { data: existing } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocked_user_id', userId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('blocked_users').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('blocked_users').insert({ blocked_user_id: userId, user_id: user.id });
    return true;
  }
}

// Create quote thread
export async function createQuoteThread(content: string, quoteThreadId: string, imageUrl?: string): Promise<Thread> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in');

  const { data, error } = await supabase
    .from('threads')
    .insert({
      user_id: user.id,
      content,
      quote_thread_id: quoteThreadId,
      image_url: imageUrl,
      media_type: imageUrl ? 'image' : 'text',
    })
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .single();

  if (error) throw error;
  return data as Thread;
}
