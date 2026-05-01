import { useState } from 'react';
import { Plus, X, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PollCreatorProps {
  onPollChange: (poll: { question: string; options: string[]; duration: number } | null) => void;
}

export function PollCreator({ onPollChange }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(24);
  const [enabled, setEnabled] = useState(false);

  const update = (q: string, opts: string[], dur: number) => {
    if (!q.trim() || opts.filter(o => o.trim()).length < 2) {
      onPollChange(null);
    } else {
      onPollChange({ question: q.trim(), options: opts.filter(o => o.trim()), duration: dur });
    }
  };

  const handleQuestion = (v: string) => { setQuestion(v); update(v, options, duration); };
  const handleOption = (i: number, v: string) => {
    const next = [...options];
    next[i] = v;
    setOptions(next);
    update(question, next, duration);
  };
  const addOption = () => {
    if (options.length >= 4) return;
    const next = [...options, ''];
    setOptions(next);
    update(question, next, duration);
  };
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    update(question, next, duration);
  };

  if (!enabled) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 text-xs h-8 rounded-full border-border/60"
        onClick={() => setEnabled(true)}
      >
        <BarChart2 className="h-3.5 w-3.5" />
        Add Poll
      </Button>
    );
  }

  return (
    <div className="mt-3 border border-border/60 rounded-2xl p-3 space-y-2.5 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BarChart2 className="h-4 w-4 text-primary" />
          Poll
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { setEnabled(false); onPollChange(null); }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Input
        value={question}
        onChange={(e) => handleQuestion(e.target.value)}
        placeholder="Ask a question..."
        className="text-sm"
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => handleOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="text-sm flex-1"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={() => removeOption(i)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}

        {options.length < 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-1.5 text-muted-foreground"
            onClick={addOption}
          >
            <Plus className="h-3.5 w-3.5" />
            Add option
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Duration:</span>
        {[1, 24, 72, 168].map(h => (
          <button
            key={h}
            onClick={() => { setDuration(h); update(question, options, h); }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              duration === h ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {h === 1 ? '1h' : h === 24 ? '1d' : h === 72 ? '3d' : '7d'}
          </button>
        ))}
      </div>
    </div>
  );
}
