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
      className="flex items-center justify-between p-3 hover:bg-card/80 rounded-xl transition-all cursor-pointer border border-transparent hover:border-primary/20 hover:shadow-md group"
      onClick={() => navigate(`/profile/${user.username}`)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
            <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
              {user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {(user.threads_count || 0) > 10 && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
              ✓
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate group-hover:text-primary transition-colors">{user.username}</p>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{user.followers_count || 0}</span> followers
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{user.threads_count || 0}</span> threads
            </p>
          </div>
        </div>
      </div>
      <Button
        onClick={handleFollow}
        disabled={loading}
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
        className="rounded-full font-semibold shadow-sm hover:shadow-md transition-all flex-shrink-0"
      >
        {loading ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isFollowing ? (
          'Following'
        ) : (
          '+ Follow'
        )}
      </Button>
    </div>
  );
}
