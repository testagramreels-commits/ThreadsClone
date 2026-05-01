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
  media_type?: 'text' | 'image' | 'video' | 'poll';
  quote_thread_id?: string;
  poll_id?: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  likes_count?: number;
  replies_count?: number;
  reposts_count?: number;
  bookmarks_count?: number;
  views_count?: number;
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
  parent_reply_id?: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  likes_count?: number;
  is_liked?: boolean;
  replies?: ThreadReply[];
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
  verified?: boolean;
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

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  expires_at: string;
  created_at: string;
  user?: UserProfile;
  viewed?: boolean;
  views_count?: number;
}

export interface Poll {
  id: string;
  thread_id?: string;
  user_id: string;
  question: string;
  options: PollOption[];
  ends_at?: string;
  created_at: string;
  total_votes?: number;
  user_vote?: number;
}

export interface PollOption {
  text: string;
  votes?: number;
}

export interface UserAd {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  budget_usd: number;
  duration_days: number;
  status: 'pending' | 'active' | 'paused' | 'ended' | 'rejected';
  impressions: number;
  clicks: number;
  paypal_payment_id?: string;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  user?: UserProfile;
}

export interface CreatorStats {
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalThreads: number;
  followerGrowth: number;
  topThreads: Thread[];
  engagementRate: number;
  weeklyData: { day: string; views: number; likes: number; replies: number }[];
}
