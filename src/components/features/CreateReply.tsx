import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { createThreadReply } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreateReplyProps {
  threadId: string;
  onReplyCreated?: () => void;
}

export function CreateReply({ threadId, onReplyCreated }: CreateReplyProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleReply = async () => {
    if (!content.trim() || !user) return;

    setLoading(true);
    try {
      await createThreadReply(threadId, content);
      setContent('');
      toast({
        title: 'Reply posted!',
        description: 'Your reply has been shared.',
      });
      onReplyCreated?.();
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
    <div className="flex gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
        <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-3">
        <Textarea
          placeholder="Write your reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none"
        />

        <div className="flex justify-end">
          <Button
            onClick={handleReply}
            disabled={!content.trim() || loading}
            className="rounded-full px-6"
          >
            {loading ? 'Posting...' : 'Reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
