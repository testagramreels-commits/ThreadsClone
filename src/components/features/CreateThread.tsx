import { useState, useRef } from 'react';
import { Image, Smile, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { createThread, uploadImage, uploadVideo } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreateThreadProps {
  onThreadCreated?: () => void;
}

export function CreateThread({ onThreadCreated }: CreateThreadProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
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

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Clear image if video is selected
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'thread-images');
      }
      
      if (videoFile) {
        toast({
          title: 'Uploading video...',
          description: 'This may take a moment',
        });
        videoUrl = await uploadVideo(videoFile);
      }
      
      await createThread(content, imageUrl, videoUrl);
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setVideoFile(null);
      setVideoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
      
      toast({
        title: 'Thread posted!',
        description: 'Your thread has been shared.',
      });
      onThreadCreated?.();
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
    <div className="border-b p-4 animate-fade-in">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
          <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold">{user?.username || 'Guest'}</p>
            <Textarea
              placeholder="Start a thread..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-base"
            />
          </div>

          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Upload preview" className="w-full max-h-96 object-cover" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 rounded-full"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {videoPreview && (
            <div className="relative rounded-xl overflow-hidden">
              <video src={videoPreview} controls className="w-full max-h-96 object-cover" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 rounded-full"
                onClick={removeVideo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="thread-image-upload"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || !!videoFile}
              >
                <Image className="h-5 w-5" />
              </Button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
                id="thread-video-upload"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => videoInputRef.current?.click()}
                disabled={loading || !!imageFile}
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Smile className="h-5 w-5" />
              </Button>
            </div>
            
            <Button 
              onClick={handlePost}
              disabled={!content.trim() || loading}
              className="rounded-full px-6"
            >
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
