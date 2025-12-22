import { supabase } from './supabase';
import { Thread, ThreadLike, ThreadReply, UserProfile, TrendingHashtag } from '@/types/database';

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

      // Get reposts count
      const { count: repostsCount } = await supabase
        .from('thread_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      // Check if current user liked this thread
      let isLiked = false;
      let isReposted = false;
      if (user) {
        const { data: like } = await supabase
          .from('thread_likes')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isReposted = !!repost;
      }

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: isLiked,
        is_reposted: isReposted,
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
      user:user_profiles(id, username, email, avatar_url, bio, website, location)
    `)
    .single();

  if (error) throw error;
  return data as ThreadReply;
}

export async function getUserProfile(username: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function getUserThreads(userId: string) {
  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url, bio, website, location)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  const threadsWithCounts = await Promise.all(
    threads.map(async (thread) => {
      const { count: likesCount } = await supabase
        .from('thread_likes')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { count: repliesCount } = await supabase
        .from('thread_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { count: repostsCount } = await supabase
        .from('thread_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      let isLiked = false;
      let isReposted = false;
      if (user) {
        const { data: like } = await supabase
          .from('thread_likes')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isReposted = !!repost;
      }

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: isLiked,
        is_reposted: isReposted,
      };
    })
  );

  return threadsWithCounts as Thread[];
}

export async function getThreadById(threadId: string) {
  const { data: thread, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url, bio, website, location)
    `)
    .eq('id', threadId)
    .single();

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  const { count: likesCount } = await supabase
    .from('thread_likes')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', thread.id);

  const { count: repliesCount } = await supabase
    .from('thread_replies')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', thread.id);

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
  } as Thread;
}

export async function getThreadReplies(threadId: string) {
  const { data, error } = await supabase
    .from('thread_replies')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url, bio, website, location)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ThreadReply[];
}

export async function uploadImage(file: File, bucket: 'thread-images' | 'avatars'): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload images');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function updateUserProfile(updates: Partial<UserProfile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to update profile');

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function searchThreads(query: string) {
  const { data, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .or(`content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  const threadsWithCounts = await Promise.all(
    data.map(async (thread) => {
      const { count: likesCount } = await supabase
        .from('thread_likes')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { count: repliesCount } = await supabase
        .from('thread_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { count: repostsCount } = await supabase
        .from('thread_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      let isLiked = false;
      let isReposted = false;
      if (user) {
        const { data: like } = await supabase
          .from('thread_likes')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isReposted = !!repost;
      }

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: isLiked,
        is_reposted: isReposted,
      };
    })
  );

  return threadsWithCounts as Thread[];
}

export async function toggleThreadRepost(threadId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to repost a thread');

  // Check if already reposted
  const { data: existingRepost } = await supabase
    .from('thread_reposts')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .single();

  if (existingRepost) {
    // Unrepost
    const { error } = await supabase
      .from('thread_reposts')
      .delete()
      .eq('id', existingRepost.id);
    if (error) throw error;
    return false;
  } else {
    // Repost
    const { error } = await supabase
      .from('thread_reposts')
      .insert({
        thread_id: threadId,
        user_id: user.id,
      });
    if (error) throw error;
    return true;
  }
}

export async function getTrendingHashtags(): Promise<TrendingHashtag[]> {
  // Get all threads from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: threads, error } = await supabase
    .from('threads')
    .select('content')
    .gte('created_at', sevenDaysAgo.toISOString());

  if (error) throw error;

  // Extract and count hashtags
  const hashtagCounts: { [key: string]: number } = {};
  const hashtagRegex = /#(\w+)/g;

  threads.forEach((thread) => {
    const matches = thread.content.matchAll(hashtagRegex);
    for (const match of matches) {
      const hashtag = match[0].toLowerCase();
      hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
    }
  });

  // Convert to array and sort by count
  const trending = Object.entries(hashtagCounts)
    .map(([hashtag, count]) => ({ hashtag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return trending;
}

export async function getUserLikedThreads(userId: string) {
  const { data: likes, error } = await supabase
    .from('thread_likes')
    .select(`
      thread_id,
      threads(
        *,
        user:user_profiles(id, username, email, avatar_url)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const threads = likes.map(like => like.threads).filter(Boolean);
  
  const { data: { user } } = await supabase.auth.getUser();

  const threadsWithCounts = await Promise.all(
    threads.map(async (thread: any) => {
      const { count: likesCount } = await supabase
        .from('thread_likes')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { count: repliesCount } = await supabase
        .from('thread_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      const { count: repostsCount } = await supabase
        .from('thread_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      let isLiked = false;
      let isReposted = false;
      if (user) {
        const { data: like } = await supabase
          .from('thread_likes')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .single();
        isReposted = !!repost;
      }

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: isLiked,
        is_reposted: isReposted,
      };
    })
  );

  return threadsWithCounts as Thread[];
}
