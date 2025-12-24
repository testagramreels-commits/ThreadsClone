import { useState } from 'react';
import { Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Thread } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createQuoteThread } from '@/lib/optimizedApi';
import { uploadImage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Image } from 'lucide-react';

interface QuoteThreadButtonProps {
  thread: Thread;
  onSuccess?: () => void;
}

export function QuoteThreadButton({ thread, onSuccess }: QuoteThreadButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please add your thoughts',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'thread-images');
      }

      await createQuoteThread(content, thread.id, imageUrl);
      
      toast({
        title: 'Success',
        description: 'Quote thread created!',
      });

      setContent('');
      setImageFile(null);
      setImagePreview('');
      setOpen(false);
      onSuccess?.();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Quote className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Quote Thread</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="Add your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            disabled={loading}
          />

          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded-lg max-h-64 object-cover w-full"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview('');
                }}
              >
                Remove
              </Button>
            </div>
          )}

          <div className="border rounded-lg p-4 bg-accent/20">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={thread.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.user?.username}`} />
                <AvatarFallback>{thread.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">@{thread.user?.username}</p>
                <p className="text-sm mt-1">{thread.content}</p>
                {thread.image_url && (
                  <img
                    src={thread.image_url}
                    alt="Thread image"
                    className="mt-2 rounded-lg max-h-32 object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label htmlFor="quote-image" className="cursor-pointer">
              <input
                type="file"
                id="quote-image"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={loading}
              />
              <Button variant="ghost" size="sm" asChild>
                <span>
                  <Image className="h-4 w-4 mr-2" />
                  Add Image
                </span>
              </Button>
            </label>

            <Button onClick={handleSubmit} disabled={loading || !content.trim()}>
              {loading ? 'Posting...' : 'Quote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
