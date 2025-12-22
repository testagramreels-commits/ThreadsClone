import { Heart, MoreHorizontal } from 'lucide-react';
import { ThreadReply } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ReplyCardProps {
  reply: ThreadReply;
}

export function ReplyCard({ reply }: ReplyCardProps) {
  const navigate = useNavigate();

  return (
    <article className="p-4 hover:bg-accent/50 transition-colors animate-fade-in">
      <div className="flex gap-3">
        <Avatar 
          className="h-10 w-10 ring-2 ring-background cursor-pointer"
          onClick={() => navigate(`/profile/${reply.user?.username}`)}
        >
          <AvatarImage src={reply.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.user?.username}`} />
          <AvatarFallback>{reply.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="font-semibold text-sm cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${reply.user?.username}`)}
              >
                {reply.user?.username}
              </span>
              <span className="text-muted-foreground text-sm">@{reply.user?.username}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
              </span>
            </div>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-base leading-relaxed whitespace-pre-wrap">{reply.content}</p>

          <div className="flex items-center gap-1 pt-2">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-red-500">
              <Heart className="h-4 w-4" />
              <span className="text-sm">0</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
