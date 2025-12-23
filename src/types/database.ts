export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  created_at?: string;
}

export interface Thread {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  video_url?: string;
  media_type?: 'text' | 'image' | 'video';
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  likes_count?: number;
  replies_count?: number;
  reposts_count?: number;
  is_liked?: boolean;
  is_reposted?: boolean;
}

export interface ThreadLike {
  id: string;
  thread_id: string;
  user_id: string;
  created_at: string;
}

export interface ThreadReply {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface ThreadRepost {
  id: string;
  thread_id: string;
  user_id: string;
  created_at: string;
}

export interface TrendingHashtag {
  hashtag: string;
  count: number;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface ProfileAnalytics {
  id: string;
  user_id: string;
  profile_views: number;
  total_engagement: number;
  updated_at: string;
}

export interface UserWithStats extends UserProfile {
  followers_count?: number;
  following_count?: number;
  threads_count?: number;
  is_following?: boolean;
  analytics?: ProfileAnalytics;
}
