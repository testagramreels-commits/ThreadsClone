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
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
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
