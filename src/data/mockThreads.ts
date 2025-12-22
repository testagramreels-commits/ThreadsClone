import { Thread } from '@/types/thread';

export const mockThreads: Thread[] = [
  {
    id: '1',
    user: {
      id: 'u1',
      name: 'Sarah Chen',
      username: 'sarahchen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      verified: true
    },
    content: 'Just deployed my first AI-powered app on OnSpace! The development experience is incredibly smooth. 🚀',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    likes: 124,
    replies: 8,
    reposts: 12,
    isLiked: false
  },
  {
    id: '2',
    user: {
      id: 'u2',
      name: 'Alex Rodriguez',
      username: 'alexrod',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    content: 'Hot take: Simple, consistent design systems are better than overly complex component libraries.\n\nWhat do you think?',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    likes: 89,
    replies: 23,
    reposts: 5,
    isLiked: true
  },
  {
    id: '3',
    user: {
      id: 'u3',
      name: 'Emma Wilson',
      username: 'emmawilson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
      verified: true
    },
    content: 'Building in public: Day 30 of my startup journey. Today I learned that user feedback is worth more than any feature you think is "essential". Listen to your users! 💡',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    likes: 234,
    replies: 15,
    reposts: 28,
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop'
  },
  {
    id: '4',
    user: {
      id: 'u4',
      name: 'Marcus Johnson',
      username: 'marcusj',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    },
    content: 'CSS tip: Use CSS custom properties for your design tokens. Makes theming and dark mode implementation so much easier!',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    likes: 156,
    replies: 12,
    reposts: 34,
    isLiked: false
  },
  {
    id: '5',
    user: {
      id: 'u5',
      name: 'Priya Patel',
      username: 'priyatech',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
      verified: true
    },
    content: 'Reminder: Your code doesn\'t have to be perfect. Ship it, get feedback, iterate. Progress over perfection. 🎯',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    likes: 445,
    replies: 31,
    reposts: 67,
    isLiked: true
  },
  {
    id: '6',
    user: {
      id: 'u6',
      name: 'David Kim',
      username: 'davidkim',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    },
    content: 'The best developers I know are not the ones who know everything, but the ones who know how to learn and adapt quickly.',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    likes: 289,
    replies: 18,
    reposts: 42,
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop'
  }
];
