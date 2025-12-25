import { UserSuggestionCard } from './UserSuggestionCard';
import { UserWithStats } from '@/types/database';
import { Users, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SuggestedContentProps {
  users: UserWithStats[];
  onFollowChange?: () => void;
}

export function SuggestedContent({ users, onFollowChange }: SuggestedContentProps) {
  if (users.length === 0) return null;

  return (
    <Card className="my-6 p-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5 border-primary/20 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Discover People</h2>
          <p className="text-xs text-muted-foreground">Connect with amazing creators</p>
        </div>
      </div>
      <div className="space-y-2">
        {users.slice(0, 5).map((user) => (
          <UserSuggestionCard 
            key={user.id} 
            user={user} 
            onFollowChange={onFollowChange}
          />
        ))}
      </div>
    </Card>
  );
}
