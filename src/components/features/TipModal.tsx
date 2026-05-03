import { useState } from 'react';
import { X, DollarSign, Heart, Loader2, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserWithStats } from '@/types/database';

const PAYPAL_OWNER = 'nahashonnyaga794@gmail.com';
const TIP_AMOUNTS = [1, 2, 5, 10, 20, 50];

interface TipModalProps {
  creator: UserWithStats;
  onClose: () => void;
}

export function TipModal({ creator, onClose }: TipModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(5);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const finalAmount = custom ? parseFloat(custom) : amount;

  const handlePayPalTip = async () => {
    if (!user || !finalAmount || finalAmount < 1) return;
    setSending(true);

    try {
      // Get creator's PayPal email
      const { data: settings } = await supabase
        .from('creator_settings')
        .select('paypal_email')
        .eq('user_id', creator.id)
        .maybeSingle();

      const recipientEmail = settings?.paypal_email || PAYPAL_OWNER;

      // Record tip intent in DB
      await supabase.from('creator_tips').insert({
        sender_id: user.id,
        receiver_id: creator.id,
        amount_usd: finalAmount,
        message: message || null,
        status: 'pending',
      });

      // Open PayPal.me link (or PayPal send money)
      const note = encodeURIComponent(`Tip for @${creator.username} on Threads${message ? ': ' + message : ''}`);
      const paypalUrl = `https://www.paypal.com/paypalme/${recipientEmail.split('@')[0]}/${finalAmount}USD`;
      window.open(paypalUrl, '_blank');

      toast({ title: 'Redirecting to PayPal!', description: `Sending $${finalAmount} tip to @${creator.username}` });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            Send a Tip
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-muted rounded-2xl">
          <Avatar className="h-10 w-10">
            <AvatarImage src={creator.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.username}`} />
            <AvatarFallback className="font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
              {creator.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">@{creator.username}</p>
            <p className="text-xs text-muted-foreground">Your tip goes directly to them via PayPal</p>
          </div>
        </div>

        {/* Amount grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {TIP_AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setAmount(a); setCustom(''); }}
              className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                amount === a && !custom
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary hover:text-primary'
              }`}
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="relative mb-4">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="number"
            min="1"
            value={custom}
            onChange={e => { setCustom(e.target.value); setAmount(0); }}
            placeholder="Custom amount"
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={`Say something nice to @${creator.username}… (optional)`}
          className="w-full p-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 mb-4"
          rows={2}
          maxLength={200}
        />

        <Button
          className="w-full rounded-xl h-12 text-base font-bold gap-2 bg-[#0070ba] hover:bg-[#005ea6] text-white"
          onClick={handlePayPalTip}
          disabled={sending || !finalAmount || finalAmount < 1}
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          {sending ? 'Opening PayPal...' : `Send $${finalAmount || '?'} via PayPal`}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">Powered by PayPal · Secure payment</p>
      </div>
    </div>
  );
}
