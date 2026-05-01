import { useState, useRef, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Video, X, Send, Loader2, Upload, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createThread, uploadImage, uploadVideo } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PollCreator } from './PollCreator';

interface CreateThreadProps {
  onThreadCreated?: () => void;
  placeholder?: string;
  parentId?: string;
}

const MAX_CHARS = 500;

export function CreateThread({ onThreadCreated, placeholder = "What's on your mind?", parentId }: CreateThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: 'image' | 'video' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [poll, setPoll] = useState<{ question: string; options: string[]; duration: number } | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 300) + 'px'; }
  };

  const handleMediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const valid = files.filter(f => {
      if (f.size > maxSize) {
        toast({ title: `${f.name} is too large`, description: `Max ${type === 'video' ? '100MB' : '10MB'}`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles(prev => [...prev, { file, preview: reader.result as string, type }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, [toast]);

  const removeMedia = (idx: number) => setMediaFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!user) return;
    if (!content.trim() && mediaFiles.length === 0 && !poll) return;
    if (content.length > MAX_CHARS) {
      toast({ title: 'Too long', description: `Max ${MAX_CHARS} characters`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      // Upload media with retry logic
      for (let i = 0; i < mediaFiles.length; i++) {
        const { file, type } = mediaFiles[i];
        setUploadProgress(Math.round((i / mediaFiles.length) * 70));
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (type === 'video') {
              videoUrl = await uploadVideo(file);
            } else {
              imageUrl = await uploadImage(file, 'thread-images');
            }
            break;
          } catch (err) {
            if (attempt === 2) throw err;
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      setUploadProgress(80);
      const thread = await createThread(content.trim(), imageUrl, videoUrl);
      setUploadProgress(90);

      // Create poll if any
      if (poll && thread.id) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + poll.duration);
          await supabase.from('polls').insert({
            thread_id: thread.id,
            user_id: authUser.id,
            question: poll.question,
            options: poll.options,
            ends_at: expiresAt.toISOString(),
          });
        }
      }

      setUploadProgress(100);
      setContent('');
      setMediaFiles([]);
      setPoll(null);
      setShowPoll(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast({ title: 'Thread posted!' });
      onThreadCreated?.();
    } catch (error: any) {
      toast({ title: 'Failed to post', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const remaining = MAX_CHARS - content.length;
  const isOverLimit = remaining < 0;

  return (
    <div className="border-b border-border/60 px-4 py-3">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0 mt-0.5">
          <AvatarImage src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
            {user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-1">{user?.username}</p>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); autoResize(); }}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none resize-none text-sm placeholder:text-muted-foreground leading-relaxed min-h-[40px]"
            rows={2}
          />

          {/* Media previews */}
          {mediaFiles.length > 0 && (
            <div className={`grid gap-1 mt-2 ${mediaFiles.length === 1 ? 'grid-cols-1' : mediaFiles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {mediaFiles.map((m, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-muted group">
                  {m.type === 'video' ? (
                    <video src={m.preview} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.preview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Poll */}
          {showPoll && <PollCreator onPollChange={setPoll} />}

          {/* Upload progress */}
          {loading && uploadProgress > 0 && (
            <div className="mt-2">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {uploadProgress < 80 ? 'Uploading media...' : uploadProgress < 95 ? 'Creating thread...' : 'Done!'}
              </p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => imageRef.current?.click()}
                disabled={loading}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => videoRef.current?.click()}
                disabled={loading}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Video className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowPoll(v => !v)}
                disabled={loading}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                  showPoll ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                }`}
              >
                <BarChart2 className="h-4 w-4" />
              </button>

              <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleMediaSelect(e, 'image')} />
              <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleMediaSelect(e, 'video')} />
            </div>

            <div className="flex items-center gap-2">
              {content.length > MAX_CHARS * 0.7 && (
                <span className={`text-xs font-medium ${isOverLimit ? 'text-destructive' : remaining < 50 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {remaining}
                </span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={loading || isOverLimit || (!content.trim() && mediaFiles.length === 0 && !poll)}
                size="sm"
                className="rounded-full px-4 h-8 text-xs font-semibold gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5" />Post</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
