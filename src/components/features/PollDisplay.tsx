import { useState, useEffect } from 'react';
import { BarChart2, Clock } from 'lucide-react';
import { Poll } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PollDisplayProps {
  pollId: string;
}

export function PollDisplay({ pollId }: PollDisplayProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    try {
      const { data: pollData } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();
      if (!pollData) return;

      const { data: votes } = await supabase
        .from('poll_votes')
        .select('option_index, user_id')
        .eq('poll_id', pollId);

      const voteCounts = (pollData.options as any[]).map((_: any, i: number) =>
        (votes || []).filter((v: any) => v.option_index === i).length
      );
      const total = voteCounts.reduce((a: number, b: number) => a + b, 0);
      const userVote = user ? (votes || []).find((v: any) => v.user_id === user.id)?.option_index : undefined;

      setPoll({
        ...pollData,
        options: (pollData.options as any[]).map((opt: any, i: number) => ({
          text: typeof opt === 'string' ? opt : opt.text,
          votes: voteCounts[i],
        })),
        total_votes: total,
        user_vote: userVote,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!user) { toast({ title: 'Sign in to vote', variant: 'destructive' }); return; }
    if (poll?.user_vote !== undefined) return;
    const isExpired = poll?.ends_at && new Date(poll.ends_at) < new Date();
    if (isExpired) return;

    setVoting(true);
    try {
      await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex });
      await loadPoll();
      toast({ title: 'Vote recorded!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setVoting(false); }
  };

  if (loading) return (
    <div className="border border-border/60 rounded-2xl p-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
      {[1, 2].map(i => <div key={i} className="h-9 bg-muted rounded-xl mb-2" />)}
    </div>
  );
  if (!poll) return null;

  const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();
  const showResults = poll.user_vote !== undefined || isExpired;

  return (
    <div className="border border-border/60 rounded-2xl p-3 mt-2 space-y-2" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart2 className="h-4 w-4 text-primary" />
        {poll.question}
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = poll.total_votes ? Math.round(((opt.votes || 0) / poll.total_votes) * 100) : 0;
          const isChosen = poll.user_vote === i;
          return (
            <button
              key={i}
              disabled={showResults || voting}
              onClick={() => handleVote(i)}
              className={`w-full text-left relative overflow-hidden rounded-xl border px-3 py-2 text-sm transition-all ${
                showResults
                  ? isChosen
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border/60 bg-muted/30'
                  : 'border-border hover:border-primary hover:bg-primary/5 active:scale-[0.99]'
              }`}
            >
              {showResults && (
                <div
                  className="absolute inset-0 bg-primary/10 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span>{opt.text}</span>
                {showResults && (
                  <span className={`text-xs font-semibold ${isChosen ? 'text-primary' : 'text-muted-foreground'}`}>
                    {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
        {poll.ends_at && (
          <>
            <span>·</span>
            <Clock className="h-3 w-3" />
            <span>{isExpired ? 'Poll ended' : `Ends ${formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}`}</span>
          </>
        )}
      </div>
    </div>
  );
}
