import { useState } from 'react';
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal } from 'lucide-react';
import { Thread } from '@/types/thread';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface ThreadCardProps {
  thread: Thread;
}

export function ThreadCard({ thread }: ThreadCardProps) {
  const [isLiked, setIsLiked] = useState(thread.isLiked || false);
  const [likes, setLikes] = useState(thread.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  return (
    <article className="border-b p-4 hover:bg-accent/50 transition-colors animate-fade-in">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-background">
          <AvatarImage src={thread.user.avatar} />
          <AvatarFallback>{thread.user.name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{thread.user.name}</span>
              <span className="text-muted-foreground text-sm">@{thread.user.username}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(thread.timestamp), { addSuffix: true })}
              </span>
            </div>
            
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-base leading-relaxed whitespace-pre-wrap">{thread.content}</p>
          
          {thread.image && (
            <img 
              src={thread.image} 
              alt="Thread image" 
              className="rounded-xl w-full max-h-96 object-cover mt-3"
            />
          )}
          
          <div className="flex items-center gap-1 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`gap-2 hover:text-red-500 transition-colors ${
                isLiked ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{likes}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm">{thread.replies}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Repeat2 className="h-5 w-5" />
              <span className="text-sm">{thread.reposts}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
