import { supabase } from './supabase';
import { Thread, ThreadLike, ThreadReply, UserProfile, TrendingHashtag, Follow, UserWithStats, Notification, Conversation, DirectMessage, AdPlacement } from '@/types/database';

export async function getThreads() {
  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
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
          .maybeSingle();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .maybeSingle();
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

export async function createThread(content: string, imageUrl?: string, videoUrl?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create a thread');

  let mediaType: 'text' | 'image' | 'video' = 'text';
  if (videoUrl) mediaType = 'video';
  else if (imageUrl) mediaType = 'image';

  const { data, error } = await supabase
    .from('threads')
    .insert({
      user_id: user.id,
      content,
      image_url: imageUrl,
      video_url: videoUrl,
      media_type: mediaType,
    })
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Check for mentions and create notifications
  const mentionRegex = /@(\w+)/g;
  const mentions = content.match(mentionRegex);
  if (mentions) {
    for (const mention of mentions) {
      const username = mention.substring(1);
      const { data: mentionedUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      
      if (mentionedUser) {
        await supabase.rpc('create_notification', {
          p_user_id: mentionedUser.id,
          p_actor_id: user.id,
          p_type: 'mention',
          p_thread_id: data.id,
          p_content: `mentioned you in a thread`
        });
      }
    }
  }

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
    .maybeSingle();

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('thread_likes')
      .delete()
      .eq('id', existingLike.id);
    if (error) throw error;
    return false;
  } else {
    // Like (notification will be created by trigger)
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

  // Check for mentions and create notifications
  const mentionRegex = /@(\w+)/g;
  const mentions = content.match(mentionRegex);
  if (mentions) {
    for (const mention of mentions) {
      const username = mention.substring(1);
      const { data: mentionedUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      
      if (mentionedUser) {
        await supabase.rpc('create_notification', {
          p_user_id: mentionedUser.id,
          p_actor_id: user.id,
          p_type: 'mention',
          p_thread_id: threadId,
          p_reply_id: data.id,
          p_content: `mentioned you in a reply`
        });
      }
    }
  }

  return data as ThreadReply;
}

export async function getUserProfile(username: string): Promise<UserWithStats> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('User not found');

  // Increment profile view (ignore errors)
  try {
    await supabase.rpc('increment_profile_view', { profile_user_id: data.id });
  } catch (e) {
    console.error('Failed to increment profile view:', e);
  }

  // Get followers count
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', data.id);

  // Get following count
  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', data.id);

  // Get threads count
  const { count: threadsCount } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', data.id);

  // Get analytics (may not exist)
  const { data: analytics } = await supabase
    .from('profile_analytics')
    .select('*')
    .eq('user_id', data.id)
    .maybeSingle();

  // Check if current user is following
  const { data: { user } } = await supabase.auth.getUser();
  let isFollowing = false;
  if (user && user.id !== data.id) {
    const { data: follow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', data.id)
      .maybeSingle();
    isFollowing = !!follow;
  }

  return {
    ...data,
    followers_count: followersCount || 0,
    following_count: followingCount || 0,
    threads_count: threadsCount || 0,
    is_following: isFollowing,
    analytics: analytics || undefined,
  } as UserWithStats;
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
          .maybeSingle();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .maybeSingle();
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

export async function uploadVideo(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload videos');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Show upload progress
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('videos')
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
          .maybeSingle();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .maybeSingle();
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
    .maybeSingle();

  if (existingRepost) {
    // Unrepost
    const { error } = await supabase
      .from('thread_reposts')
      .delete()
      .eq('id', existingRepost.id);
    if (error) throw error;
    return false;
  } else {
    // Repost (notification will be created by trigger)
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
          .maybeSingle();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .maybeSingle();
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

// Follow/Unfollow functions
export async function toggleFollow(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to follow users');
  if (user.id === userId) throw new Error('You cannot follow yourself');

  // Check if already following
  const { data: existingFollow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', userId)
    .maybeSingle();

  if (existingFollow) {
    // Unfollow
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', existingFollow.id);
    if (error) throw error;
    return false;
  } else {
    // Follow (notification will be created by trigger)
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: userId,
      });
    if (error) throw error;
    return true;
  }
}

// Get suggested users to follow
export async function getSuggestedUsers(): Promise<UserWithStats[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get users not already followed, sorted by activity
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*')
    .neq('id', user.id)
    .limit(10);

  if (error) throw error;

  const usersWithStats = await Promise.all(
    users.map(async (profile) => {
      // Get followers count
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      // Get threads count
      const { count: threadsCount } = await supabase
        .from('threads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      // Check if current user is following
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profile.id)
        .maybeSingle();

      return {
        ...profile,
        followers_count: followersCount || 0,
        threads_count: threadsCount || 0,
        is_following: !!follow,
      };
    })
  );

  // Filter out already followed users and sort by activity
  return usersWithStats
    .filter(u => !u.is_following)
    .sort((a, b) => (b.threads_count || 0) - (a.threads_count || 0))
    .slice(0, 5);
}

// Get trending threads
export async function getTrendingThreads(): Promise<Thread[]> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .gte('created_at', threeDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

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
          .maybeSingle();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .maybeSingle();
        isReposted = !!repost;
      }

      const engagement = (likesCount || 0) + (repliesCount || 0) * 2 + (repostsCount || 0) * 3;

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: isLiked,
        is_reposted: isReposted,
        engagement,
      };
    })
  );

  // Sort by engagement
  return threadsWithCounts
    .sort((a: any, b: any) => b.engagement - a.engagement)
    .slice(0, 20) as Thread[];
}

// Get threads from followed users
export async function getFollowingThreads(): Promise<Thread[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get followed users
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (!follows || follows.length === 0) return [];

  const followingIds = follows.map(f => f.following_id);

  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

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

      const { data: like } = await supabase
        .from('thread_likes')
        .select('id')
        .eq('thread_id', thread.id)
        .eq('user_id', user.id)
        .single();
      
      const { data: repost } = await supabase
        .from('thread_reposts')
        .select('id')
        .eq('thread_id', thread.id)
        .eq('user_id', user.id)
        .single();

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: !!like,
        is_reposted: !!repost,
      };
    })
  );

  return threadsWithCounts as Thread[];
}

// Get threads with mentions
export async function getMentionThreads(): Promise<Thread[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user profile for username
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return [];

  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .ilike('content', `%@${profile.username}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

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

      const { data: like } = await supabase
        .from('thread_likes')
        .select('id')
        .eq('thread_id', thread.id)
        .eq('user_id', user.id)
        .single();
      
      const { data: repost } = await supabase
        .from('thread_reposts')
        .select('id')
        .eq('thread_id', thread.id)
        .eq('user_id', user.id)
        .single();

      return {
        ...thread,
        likes_count: likesCount || 0,
        replies_count: repliesCount || 0,
        reposts_count: repostsCount || 0,
        is_liked: !!like,
        is_reposted: !!repost,
      };
    })
  );

  return threadsWithCounts as Thread[];
}

// Get video feed (TikTok style)
export async function getVideoFeed(): Promise<Thread[]> {
  const { data: threads, error } = await supabase
    .from('threads')
    .select(`
      *,
      user:user_profiles(id, username, email, avatar_url)
    `)
    .eq('media_type', 'video')
    .order('created_at', { ascending: false })
    .limit(50);

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
          .maybeSingle();
        isLiked = !!like;

        const { data: repost } = await supabase
          .from('thread_reposts')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('user_id', user.id)
          .maybeSingle();
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

// Notification functions
export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:actor_id(id, username, email, avatar_url),
      thread:thread_id(id, content)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

// Direct Message functions
export async function getConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1:participant1_id(id, username, email, avatar_url),
      participant2:participant2_id(id, username, email, avatar_url)
    `)
    .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  // Get last message and unread count for each conversation
  const conversationsWithDetails = await Promise.all(
    data.map(async (conv) => {
      const { data: lastMessage } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unreadCount } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      return {
        ...conv,
        last_message: lastMessage,
        unread_count: unreadCount || 0,
      };
    })
  );

  return conversationsWithDetails as Conversation[];
}

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to message users');

  const [smaller, larger] = [user.id, otherUserId].sort();

  // Check if conversation exists
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant1_id', smaller)
    .eq('participant2_id', larger)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      participant1_id: smaller,
      participant2_id: larger,
    })
    .select('id')
    .single();

  if (error) throw error;
  return newConv.id;
}

export async function getMessages(conversationId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      *,
      sender:sender_id(id, username, email, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as DirectMessage[];
}

export async function sendMessage(conversationId: string, content: string): Promise<DirectMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to send messages');

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select(`
      *,
      sender:sender_id(id, username, email, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data as DirectMessage;
}

export async function markMessagesAsRead(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

// Ad placement functions
export async function getActiveAds(position: 'feed' | 'sidebar' | 'profile' | 'video'): Promise<AdPlacement[]> {
  const { data, error } = await supabase
    .from('ad_placements')
    .select('*')
    .eq('position', position)
    .eq('is_active', true);

  if (error) return [];
  return data as AdPlacement[];
}

export async function getAllAds(): Promise<AdPlacement[]> {
  const { data, error } = await supabase
    .from('ad_placements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AdPlacement[];
}

export async function createAd(name: string, adCode: string, position: 'feed' | 'sidebar' | 'profile' | 'video'): Promise<AdPlacement> {
  const { data, error } = await supabase
    .from('ad_placements')
    .insert({
      name,
      ad_code: adCode,
      position,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AdPlacement;
}

export async function updateAd(adId: string, updates: Partial<AdPlacement>) {
  const { data, error } = await supabase
    .from('ad_placements')
    .update(updates)
    .eq('id', adId)
    .select()
    .single();

  if (error) throw error;
  return data as AdPlacement;
}

export async function deleteAd(adId: string) {
  const { error } = await supabase
    .from('ad_placements')
    .delete()
    .eq('id', adId);

  if (error) throw error;
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return false;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', profile.email)
    .maybeSingle();

  return !!admin;
}

// Get platform analytics (admin only)
export async function getPlatformAnalytics() {
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalThreads } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true });

  const { count: totalLikes } = await supabase
    .from('thread_likes')
    .select('*', { count: 'exact', head: true });

  const { count: totalReplies } = await supabase
    .from('thread_replies')
    .select('*', { count: 'exact', head: true });

  const { count: totalFollows } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true });

  const { count: videoThreads } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true })
    .eq('media_type', 'video');

  return {
    totalUsers: totalUsers || 0,
    totalThreads: totalThreads || 0,
    totalLikes: totalLikes || 0,
    totalReplies: totalReplies || 0,
    totalFollows: totalFollows || 0,
    videoThreads: videoThreads || 0,
  };
}
