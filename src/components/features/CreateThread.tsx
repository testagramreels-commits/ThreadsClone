import { useState, useRef } from 'react';
import { Image, X, Video, Hash, AtSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { createThread, uploadImage, uploadVideo } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreateThreadProps {
  onThreadCreated?: () => void;
  compact?: boolean;
}

export function CreateThread({ onThreadCreated, compact = false }: CreateThreadProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setVideoFile(null); setVideoPreview(null);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setVideoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setImageFile(null); setImagePreview(null);
  };

  const insertText = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = content.substring(0, pos);
    const after = content.substring(pos);
    const separator = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
    const newContent = before + separator + prefix;
    setContent(newContent + after);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = newContent.length;
    }, 0);
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      if (imageFile) imageUrl = await uploadImage(imageFile, 'thread-images');
      if (videoFile) {
        toast({ title: 'Uploading video…', description: 'This may take a moment' });
        videoUrl = await uploadVideo(videoFile);
      }

      await createThread(content, imageUrl, videoUrl);
      setContent(''); setImageFile(null); setImagePreview(null);
      setVideoFile(null); setVideoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      toast({ title: 'Posted!', description: 'Your thread has been shared.' });
      onThreadCreated?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const CHAR_LIMIT = 500;
  const remaining = CHAR_LIMIT - content.length;

  return (
    <div className={`border-b bg-background ${compact ? 'p-4' : 'p-4'}`}>
      {compact && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">New thread</h2>
        </div>
      )}

      <div className="flex gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
          <AvatarImage src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground text-sm font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-semibold leading-none">{user?.username || 'Guest'}</p>

          <textarea
            ref={textareaRef}
            placeholder="Start a thread…"
            value={content}
            onChange={(e) => setContent(e.target.value.substring(0, CHAR_LIMIT))}
            rows={compact ? 4 : 3}
            className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-cover" />
              <button
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Video preview */}
          {videoPreview && (
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <video src={videoPreview} controls className="w-full max-h-72 object-cover" />
              <button
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                onClick={() => { setVideoFile(null); setVideoPreview(null); if (videoInputRef.current) videoInputRef.current.value = ''; }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-0.5">
              {/* Image */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || !!videoFile}
                className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
              >
                <Image className="h-5 w-5" />
              </button>

              {/* Video */}
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={loading || !!imageFile}
                className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
              >
                <Video className="h-5 w-5" />
              </button>

              {/* Hashtag */}
              <button
                onClick={() => insertText('#')}
                className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Hash className="h-5 w-5" />
              </button>

              {/* Mention */}
              <button
                onClick={() => insertText('@')}
                className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <AtSign className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className={`text-xs tabular-nums ${remaining < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {remaining}
                </span>
              )}
              <Button
                onClick={handlePost}
                disabled={!content.trim() || loading}
                size="sm"
                className="rounded-full px-5 h-8 text-sm font-semibold"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
