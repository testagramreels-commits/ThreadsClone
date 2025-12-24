import { supabase } from './supabase';
import { Thread } from '@/types/database';

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

export async function getThreadsOptimized(
  limit: number = 50,
  offset: number = 0,
  mediaType?: 'text' | 'image' | 'video',
  followingOnly: boolean = false
): Promise<Thread[]> {
  const { data: { user } } = await supabase.auth.getUser();

  // Use the optimized database function
  const { data, error } = await supabase
    .rpc('get_threads_with_stats', {
      p_user_id: user?.id || null,
      p_limit: limit,
      p_offset: offset,
      p_media_type: mediaType || null,
      p_following_only: followingOnly
    });

  if (error) {
    console.error('Error fetching threads:', error);
    throw error;
  }

  // Transform the data to match Thread interface
  const threads: Thread[] = (data as ThreadWithStats[] || []).map((t: ThreadWithStats) => ({
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
  }));

  return threads;
}

export async function getMixedFeed(limit: number = 50): Promise<Thread[]> {
  const { data: { user } } = await supabase.auth.getUser();

  // Get mixed content: 70% text/images, 30% videos
  const textLimit = Math.floor(limit * 0.7);
  const videoLimit = Math.ceil(limit * 0.3);

  const [textThreads, videoThreads] = await Promise.all([
    getThreadsOptimized(textLimit, 0, undefined, false),
    getThreadsOptimized(videoLimit, 0, 'video', false)
  ]);

  // Interleave videos organically into the feed
  const mixed: Thread[] = [];
  let textIndex = 0;
  let videoIndex = 0;

  for (let i = 0; i < limit; i++) {
    // Add a video every 5 posts
    if (i > 0 && i % 5 === 0 && videoIndex < videoThreads.length) {
      mixed.push(videoThreads[videoIndex++]);
    } else if (textIndex < textThreads.length) {
      mixed.push(textThreads[textIndex++]);
    } else if (videoIndex < videoThreads.length) {
      mixed.push(videoThreads[videoIndex++]);
    }
  }

  return mixed;
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
    .single();

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
    .eq('user_id', user.id);

  if (!bookmarks || bookmarks.length === 0) return [];

  const threadIds = bookmarks.map(b => b.thread_id);
  
  const { data } = await supabase
    .rpc('get_threads_with_stats', {
      p_user_id: user.id,
      p_limit: 100,
      p_offset: 0,
    });

  if (!data) return [];

  // Filter to only bookmarked threads
  const bookmarkedThreads = (data as ThreadWithStats[])
    .filter((t: ThreadWithStats) => threadIds.includes(t.id))
    .map((t: ThreadWithStats) => ({
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
    }));

  return bookmarkedThreads;
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
    .single();

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
    .single();

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
