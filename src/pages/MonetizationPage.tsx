import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Gift, Star, Crown, Zap, Check,
  Settings2, TrendingUp, Users, BarChart3, ExternalLink, Loader2,
  Lock, Unlock, ChevronRight, Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/features/BottomNav';

interface CreatorSettings {
  id?: string;
  user_id: string;
  is_monetized: boolean;
  tip_enabled: boolean;
  subscription_enabled: boolean;
  basic_tier_price: number;
  pro_tier_price: number;
  vip_tier_price: number;
  paypal_email: string;
  total_earnings: number;
}

interface EarningsSummary {
  total_tips: number;
  tips_count: number;
  total_subscriptions: number;
  subs_count: number;
}

export function MonetizationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<CreatorSettings | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary>({ total_tips: 0, tips_count: 0, total_subscriptions: 0, subs_count: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);

  useEffect(() => {
    loadSettings();
    loadEarnings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('creator_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setPaypalEmail(data.paypal_email || '');
    } else {
      const defaults: CreatorSettings = {
        user_id: user.id,
        is_monetized: false,
        tip_enabled: true,
        subscription_enabled: false,
        basic_tier_price: 2.99,
        pro_tier_price: 9.99,
        vip_tier_price: 24.99,
        paypal_email: '',
        total_earnings: 0,
      };
      setSettings(defaults);
    }
    setLoading(false);
  };

  const loadEarnings = async () => {
    if (!user) return;
    const { data: tips } = await supabase
      .from('creator_tips')
      .select('amount_usd')
      .eq('receiver_id', user.id)
      .eq('status', 'completed');

    const { data: subs } = await supabase
      .from('creator_subscriptions')
      .select('amount_usd')
      .eq('creator_id', user.id)
      .eq('status', 'active');

    const totalTips = tips?.reduce((s, t) => s + Number(t.amount_usd), 0) || 0;
    const totalSubs = subs?.reduce((s, t) => s + Number(t.amount_usd), 0) || 0;

    setEarnings({
      total_tips: totalTips,
      tips_count: tips?.length || 0,
      total_subscriptions: totalSubs,
      subs_count: subs?.length || 0,
    });
  };

  const saveSettings = async (updates: Partial<CreatorSettings>) => {
    if (!user || !settings) return;
    setSaving(true);
    try {
      const merged = { ...settings, ...updates };
      if (settings.id) {
        await supabase.from('creator_settings').update(merged).eq('user_id', user.id);
      } else {
        const { data } = await supabase.from('creator_settings').insert(merged).select().single();
        if (data) setSettings(data);
      }
      setSettings(merged);
      toast({ title: 'Saved!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleMonetize = () => {
    if (!settings) return;
    if (!paypalEmail && !settings.is_monetized) {
      toast({ title: 'Add PayPal email first', description: 'We need your PayPal email to send you money', variant: 'destructive' });
      setEditingEmail(true);
      return;
    }
    saveSettings({ is_monetized: !settings.is_monetized });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalEarnings = earnings.total_tips + earnings.total_subscriptions;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-base">Creator Monetization</h1>
          {saving && <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />}
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28 px-4 space-y-5 pt-5">
        {/* Earnings summary */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 rounded-3xl p-5 text-white shadow-lg">
          <p className="text-sm font-medium text-white/80 mb-1">Total Earnings</p>
          <p className="text-4xl font-black">${totalEarnings.toFixed(2)}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <div>
              <p className="font-bold">${earnings.total_tips.toFixed(2)}</p>
              <p className="text-white/70">Tips ({earnings.tips_count})</p>
            </div>
            <div>
              <p className="font-bold">${earnings.total_subscriptions.toFixed(2)}</p>
              <p className="text-white/70">Subscriptions ({earnings.subs_count})</p>
            </div>
          </div>
          <p className="text-xs text-white/60 mt-3">Payments are sent directly to your PayPal</p>
        </div>

        {/* Monetization toggle */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${settings?.is_monetized ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                <DollarSign className={`h-5 w-5 ${settings?.is_monetized ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">Creator Monetization</p>
                <p className="text-xs text-muted-foreground">{settings?.is_monetized ? 'Active — fans can support you' : 'Enable to start earning'}</p>
              </div>
            </div>
            <Switch checked={settings?.is_monetized || false} onCheckedChange={toggleMonetize} />
          </div>
        </div>

        {/* PayPal email */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-[#0070ba]" />
              PayPal Email
            </p>
            <button onClick={() => setEditingEmail(e => !e)} className="text-xs text-primary font-medium">
              {editingEmail ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingEmail ? (
            <div className="flex gap-2">
              <input
                type="email"
                value={paypalEmail}
                onChange={e => setPaypalEmail(e.target.value)}
                placeholder="your@paypal.com"
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => { saveSettings({ paypal_email: paypalEmail }); setEditingEmail(false); }}
              >
                Save
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {settings?.paypal_email || <span className="italic text-amber-500">Not set — add your PayPal email to receive payments</span>}
            </p>
          )}
        </div>

        {/* Tips settings */}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Gift className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Tips</p>
                <p className="text-xs text-muted-foreground">Let fans send you tips via PayPal</p>
              </div>
            </div>
            <Switch
              checked={settings?.tip_enabled || false}
              onCheckedChange={v => saveSettings({ tip_enabled: v })}
            />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Star className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Subscriptions</p>
                <p className="text-xs text-muted-foreground">Monthly paid memberships</p>
              </div>
            </div>
            <Switch
              checked={settings?.subscription_enabled || false}
              onCheckedChange={v => saveSettings({ subscription_enabled: v })}
            />
          </div>
        </div>

        {/* Subscription tiers */}
        {settings?.subscription_enabled && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider px-1">Subscription Tiers</h3>
            {[
              { key: 'basic_tier_price', icon: <Zap className="h-4 w-4 text-blue-500" />, label: 'Basic', color: 'blue', perks: ['Access to exclusive posts', 'Direct message priority'] },
              { key: 'pro_tier_price', icon: <Star className="h-4 w-4 text-purple-500" />, label: 'Pro', color: 'purple', perks: ['Everything in Basic', 'Monthly shoutout', 'Badge on profile'] },
              { key: 'vip_tier_price', icon: <Crown className="h-4 w-4 text-amber-500" />, label: 'VIP', color: 'amber', perks: ['Everything in Pro', '1-on-1 chat sessions', 'Early content access'] },
            ].map(tier => (
              <div key={tier.key} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {tier.icon}
                    <span className="font-bold text-sm">{tier.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0.99"
                      step="0.01"
                      value={(settings as any)[tier.key]}
                      onChange={e => saveSettings({ [tier.key]: parseFloat(e.target.value) } as any)}
                      className="w-16 text-right font-bold border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>
                <ul className="space-y-1">
                  {tier.perks.map(p => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <button onClick={() => navigate('/analytics')} className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors rounded-t-2xl">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Creator Analytics</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
          <button onClick={() => navigate('/create-ad')} className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors rounded-b-2xl">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Promote Your Content</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground px-4 pb-2">
          Platform fee: 10% of all earnings. Payouts via PayPal. You keep 90%.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
