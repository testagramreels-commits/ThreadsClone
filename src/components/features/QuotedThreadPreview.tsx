import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface QuotedThreadPreviewProps {
  quoteThreadId: string;
}

export function QuotedThreadPreview({ quoteThreadId }: QuotedThreadPreviewProps) {
  const [quoted, setQuoted] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('threads')
      .select('id,content,user:user_profiles(id,username,avatar_url)')
      .eq('id', quoteThreadId)
      .maybeSingle()
      .then(({ data }) => {
        setQuoted(data);
        setLoaded(true);
      });
  }, [quoteThreadId]);

  if (!loaded) {
    return <div className="border border-border/60 rounded-xl p-3 mt-2 animate-pulse h-14 bg-muted/30" />;
  }
  if (!quoted) return null;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/thread/${quoteThreadId}`); }}
      className="w-full text-left border border-border/60 rounded-xl p-3 mt-1.5 bg-muted/20 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <Avatar className="h-5 w-5 flex-shrink-0">
          <AvatarImage src={quoted.user?.avatar_url} />
          <AvatarFallback className="text-[10px] font-bold">
            {quoted.user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-semibold">@{quoted.user?.username}</span>
        <Quote className="h-3 w-3 text-muted-foreground ml-auto" />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 text-left">{quoted.content}</p>
    </button>
  );
}
