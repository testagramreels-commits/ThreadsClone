import { useState } from 'react';
import { Image, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function CreateThread() {
  const [content, setContent] = useState('');

  const handlePost = () => {
    if (!content.trim()) return;
    console.log('Posting thread:', content);
    setContent('');
  };

  return (
    <div className="border-b p-4 animate-fade-in">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Your Name</p>
            <Textarea
              placeholder="Start a thread..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-base"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Image className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Smile className="h-5 w-5" />
              </Button>
            </div>
            
            <Button 
              onClick={handlePost}
              disabled={!content.trim()}
              className="rounded-full px-6"
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
