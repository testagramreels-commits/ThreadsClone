import { UserSuggestionCard } from './UserSuggestionCard';
import { UserWithStats } from '@/types/database';
import { Users, Sparkles } from 'lucide-react';

interface SuggestedContentProps {
  users: UserWithStats[];
  onFollowChange?: () => void;
}

export function SuggestedContent({ users, onFollowChange }: SuggestedContentProps) {
  if (users.length === 0) return null;

  return (
    <div className="border-y py-6 my-4 bg-accent/20 animate-fade-in">
      <div className="flex items-center gap-2 mb-4 px-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-lg">Suggested for you</h2>
      </div>
      <div className="space-y-2 px-4">
        {users.slice(0, 3).map((user) => (
          <UserSuggestionCard 
            key={user.id} 
            user={user} 
            onFollowChange={onFollowChange}
          />
        ))}
      </div>
    </div>
  );
}
