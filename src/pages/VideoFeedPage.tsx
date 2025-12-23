import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { VideoCard } from '@/components/features/VideoCard';
import { getVideoFeed } from '@/lib/api';
import { Thread } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function VideoFeedPage() {
  const [videos, setVideos] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (e.deltaY > 0 && currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (e.deltaY < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    };

    window.addEventListener('wheel', handleScroll);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, videos.length]);

  const loadVideos = async () => {
    try {
      const data = await getVideoFeed();
      setVideos(data);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
          <div className="border-b p-4 sticky top-16 glass-effect z-10 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Video Feed</h1>
            </div>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            <p>No videos available yet</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-black">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div
        className="h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}vh)` }}
      >
        {videos.map((video, index) => (
          <div key={video.id} className="h-screen w-full">
            <VideoCard thread={video} isActive={index === currentIndex} />
          </div>
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-2 h-8' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
