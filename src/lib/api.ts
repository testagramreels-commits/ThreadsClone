import { supabase } from './supabase';
import { Thread, ThreadLike, ThreadReply } from '@/types/database';

export async function getThreads() {
  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch likes and replies counts for each thread
  const threadsWithCounts = await Promise.all(
    threads.map(async (thread) => {
      // Get likes count
      const { count: likesCount } = await supabase
        .from('thread_likes')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      // Get replies count
      const { count: repliesCount } = await supabase
        .from('thread_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      // Check if current user liked this thread
      let isLiked = false;
      if (user) {
        const { data: like } = await supabase
          .from('thread_likes')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isLiked = !!like;
      }

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        is_liked: isLiked,
      };
    })
  );

  return threadsWithCounts as Thread[];
}

export async function createThread(content: string, imageUrl?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create a thread');

  const { data, error } = await supabase
    .from('threads')
    .insert({
      user_id: user.id,
      content,
      image_url: imageUrl,
    })
    .select(`
      *,
      user:user_profiles(id, username, email)
    `)
    .single();

  if (error) throw error;
  return data as Thread;
}

export async function toggleThreadLike(threadId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to like a thread');

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('thread_likes')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('thread_likes')
      .delete()
      .eq('id', existingLike.id);
    if (error) throw error;
    return false;
  } else {
    // Like
    const { error } = await supabase
      .from('thread_likes')
      .insert({
        thread_id: threadId,
        user_id: user.id,
      });
    if (error) throw error;
    return true;
  }
}

export async function createThreadReply(threadId: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to reply');

  const { data, error } = await supabase
    .from('thread_replies')
    .insert({
      thread_id: threadId,
      user_id: user.id,
      content,
    })
    .select(`
      *,
      user:user_profiles(id, username, email)
    `)
    .single();

  if (error) throw error;
  return data as ThreadReply;
}
