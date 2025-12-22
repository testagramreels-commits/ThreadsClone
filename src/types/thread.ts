export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified?: boolean;
}

export interface Thread {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  reposts: number;
  isLiked?: boolean;
  image?: string;
}
