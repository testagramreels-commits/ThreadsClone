import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleBookmark } from '@/lib/optimizedApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  threadId: string;
  isBookmarked?: boolean;
  bookmarksCount?: number;
  onToggle?: () => void;
}

export function BookmarkButton({ threadId, isBookmarked = false, bookmarksCount = 0, onToggle }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [count, setCount] = useState(bookmarksCount);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      const newBookmarked = await toggleBookmark(threadId);
      setBookmarked(newBookmarked);
      setCount(prev => newBookmarked ? prev + 1 : Math.max(0, prev - 1));
      onToggle?.();
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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={cn('gap-2', bookmarked && 'text-yellow-500')}
    >
      <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
      {count > 0 && <span className="text-xs">{count}</span>}
    </Button>
  );
}
