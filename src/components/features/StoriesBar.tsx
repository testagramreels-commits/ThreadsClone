import { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Story } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface StoryGroup {
  userId: string;
  username: string;
  avatar_url?: string;
  stories: Story[];
  hasViewed: boolean;
}

export function StoriesBar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    if (!user) return;
    try {
      const { data: stories } = await supabase
        .from('stories')
        .select('*, user:user_profiles(id, username, email, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      const { data: viewedData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id);
      const viewedIds = new Set((viewedData || []).map((v: any) => v.story_id));

      const groups: { [userId: string]: StoryGroup } = {};
      (stories || []).forEach((s: any) => {
        if (!groups[s.user_id]) {
          groups[s.user_id] = {
            userId: s.user_id,
            username: s.user?.username || 'Unknown',
            avatar_url: s.user?.avatar_url,
            stories: [],
            hasViewed: true,
          };
        }
        const story: Story = { ...s, user: s.user };
        groups[s.user_id].stories.push(story);
        if (!viewedIds.has(s.id)) groups[s.user_id].hasViewed = false;
      });

      // Own stories first
      const groupList = Object.values(groups).sort((a) => (a.userId === user.id ? -1 : 1));
      setStoryGroups(groupList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      let url: string;
      if (isVideo) {
        const { uploadVideo } = await import('@/lib/api');
        url = await uploadVideo(file);
      } else {
        url = await uploadImage(file, 'thread-images');
      }
      await supabase.from('stories').insert({
        user_id: user.id,
        media_url: url,
        media_type: isVideo ? 'video' : 'image',
      });
      toast({ title: 'Story posted!' });
      loadStories();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const openStory = (group: StoryGroup, index = 0) => {
    setViewingGroup(group);
    setStoryIndex(index);
    setProgress(0);
    markViewed(group.stories[index]?.id);
  };

  const markViewed = async (storyId?: string) => {
    if (!storyId || !user) return;
    await supabase.from('story_views').upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: 'story_id,viewer_id' });
  };

  const nextStory = () => {
    if (!viewingGroup) return;
    if (storyIndex < viewingGroup.stories.length - 1) {
      const next = storyIndex + 1;
      setStoryIndex(next);
      setProgress(0);
      markViewed(viewingGroup.stories[next]?.id);
    } else {
      // Next group
      const groupIdx = storyGroups.findIndex(g => g.userId === viewingGroup.userId);
      if (groupIdx < storyGroups.length - 1) {
        openStory(storyGroups[groupIdx + 1]);
      } else {
        setViewingGroup(null);
      }
    }
  };

  const prevStory = () => {
    if (!viewingGroup) return;
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (!viewingGroup) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { nextStory(); return 0; }
        return p + 2;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [viewingGroup, storyIndex]);

  const ownGroup = storyGroups.find(g => g.userId === user?.id);
  const otherGroups = storyGroups.filter(g => g.userId !== user?.id);

  return (
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/40">
        {/* Add Story */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="relative">
            {uploading ? (
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className={`h-14 w-14 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all ${
                  ownGroup
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-dashed border-border hover:border-primary'
                }`}
              >
                {ownGroup ? (
                  <img
                    src={ownGroup.stories[0]?.media_url || user?.avatar_url}
                    alt="My story"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                    }}
                  />
                ) : (
                  <Plus className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            )}
            {!uploading && (
              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium truncate w-14 text-center">Your story</span>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
        </div>

        {/* Other stories */}
        {otherGroups.map(group => (
          <div key={group.userId} className="flex-shrink-0 flex flex-col items-center gap-1">
            <button
              onClick={() => openStory(group)}
              className={`h-14 w-14 rounded-full p-0.5 ${
                group.hasViewed
                  ? 'bg-muted'
                  : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
              }`}
            >
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={group.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.username}`} />
                <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                  {group.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <span className="text-[10px] text-muted-foreground truncate w-14 text-center">{group.username}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 py-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
                <div className="h-2 w-12 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Story Viewer */}
      {viewingGroup && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setViewingGroup(null)}>
          <div className="relative w-full max-w-sm h-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-3">
              {viewingGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full bg-white transition-none rounded-full"
                    style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-2 px-3 pt-2">
              <Avatar className="h-8 w-8 border border-white/30">
                <AvatarImage src={viewingGroup.avatar_url} />
                <AvatarFallback className="text-xs">{viewingGroup.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-semibold">{viewingGroup.username}</span>
              <span className="text-white/60 text-xs">
                {formatDistanceToNow(new Date(viewingGroup.stories[storyIndex]?.created_at || ''), { addSuffix: true })}
              </span>
              <button onClick={() => setViewingGroup(null)} className="ml-auto p-1">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Media */}
            <div className="w-full h-full bg-black rounded-2xl overflow-hidden">
              {viewingGroup.stories[storyIndex]?.media_type === 'video' ? (
                <video
                  key={viewingGroup.stories[storyIndex].id}
                  src={viewingGroup.stories[storyIndex].media_url}
                  autoPlay
                  muted={false}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  key={viewingGroup.stories[storyIndex].id}
                  src={viewingGroup.stories[storyIndex]?.media_url}
                  alt="Story"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Caption */}
            {viewingGroup.stories[storyIndex]?.caption && (
              <div className="absolute bottom-16 left-0 right-0 px-4">
                <p className="text-white text-sm bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
                  {viewingGroup.stories[storyIndex].caption}
                </p>
              </div>
            )}

            {/* Nav */}
            <button className="absolute left-0 top-0 bottom-0 w-1/3 z-20" onClick={prevStory} />
            <button className="absolute right-0 top-0 bottom-0 w-1/3 z-20" onClick={nextStory} />
          </div>
        </div>
      )}
    </>
  );
}
