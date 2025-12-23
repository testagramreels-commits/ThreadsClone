import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserWithStats } from '@/types/database';
import { toggleFollow } from '@/lib/api';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserSuggestionCardProps {
  user: UserWithStats;
  onFollowChange?: () => void;
}

export function UserSuggestionCard({ user, onFollowChange }: UserSuggestionCardProps) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const followed = await toggleFollow(user.id);
      setIsFollowing(followed);
      onFollowChange?.();
      toast({
        title: followed ? 'Following!' : 'Unfollowed',
        description: followed ? `You're now following @${user.username}` : `You unfollowed @${user.username}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors cursor-pointer"
      onClick={() => navigate(`/profile/${user.username}`)}
    >
      <div className="flex items-center gap-3 flex-1">
        <Avatar className="h-12 w-12 ring-2 ring-background">
          <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
          <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{user.username}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {user.followers_count || 0} followers · {user.threads_count || 0} threads
          </p>
        </div>
      </div>
      <Button
        onClick={handleFollow}
        disabled={loading}
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
        className="rounded-full"
      >
        {isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
}
