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
  quote_thread_id?: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  likes_count?: number;
  replies_count?: number;
  reposts_count?: number;
  bookmarks_count?: number;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
  quoted_thread?: Thread;
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
  parent_reply_id?: string;
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
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

export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: 'like' | 'reply' | 'follow' | 'repost' | 'mention' | 'trending';
  thread_id?: string;
  reply_id?: string;
  is_read: boolean;
  content?: string;
  created_at: string;
  actor?: UserProfile;
  thread?: Thread;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  created_at: string;
  participant1?: UserProfile;
  participant2?: UserProfile;
  last_message?: DirectMessage;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: UserProfile;
}

export interface AdPlacement {
  id: string;
  name: string;
  ad_code: string;
  position: 'feed' | 'sidebar' | 'profile' | 'video';
  is_active: boolean;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  thread_id: string;
  created_at: string;
}

export interface MutedUser {
  id: string;
  user_id: string;
  muted_user_id: string;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  created_at: string;
}
