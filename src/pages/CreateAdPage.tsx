import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, DollarSign, Calendar, Target, Link,
  Image as ImageIcon, Loader2, CheckCircle, ExternalLink, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BottomNav } from '@/components/features/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const PRICING = [
  { days: 1, label: '1 day', price: 5, reach: '~500 impressions' },
  { days: 3, label: '3 days', price: 12, reach: '~1,500 impressions' },
  { days: 7, label: '1 week', price: 25, reach: '~5,000 impressions' },
  { days: 14, label: '2 weeks', price: 45, reach: '~12,000 impressions' },
  { days: 30, label: '1 month', price: 80, reach: '~30,000 impressions' },
];

const PAYPAL_EMAIL = 'nahashonnyaga794@gmail.com';

export function CreateAdPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [adId, setAdId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link_url: '',
    image_url: '',
    selectedPlan: PRICING[1],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitAd = async () => {
    if (!user || !formData.title || !formData.description) return;
    setLoading(true);
    try {
      let imgUrl = formData.image_url;
      if (imageFile) {
        imgUrl = await uploadImage(imageFile, 'thread-images');
      }

      const { data, error } = await supabase.from('user_ads').insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        link_url: formData.link_url || null,
        image_url: imgUrl || null,
        budget_usd: formData.selectedPlan.price,
        duration_days: formData.selectedPlan.days,
        status: 'pending',
      }).select().single();

      if (error) throw error;
      setAdId(data.id);
      setStep('payment');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDone = async () => {
    if (!adId) return;
    toast({ title: 'Payment submitted!', description: 'Your ad will be reviewed and activated within 24 hours.' });
    setStep('success');
  };

  const paypalUrl = `https://www.paypal.com/paypalme/${PAYPAL_EMAIL.split('@')[0]}/${formData.selectedPlan.price}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => step === 'form' ? navigate(-1) : setStep('form')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-base">Promote Your Content</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28 px-4">
        {step === 'success' ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Ad Submitted!</h2>
            <p className="text-muted-foreground max-w-xs">
              Your ad is pending review. Once payment is confirmed, it will go live within 24 hours.
            </p>
            <Button onClick={() => navigate('/')} className="rounded-full mt-2">Back to Home</Button>
          </div>
        ) : step === 'payment' ? (
          <div className="mt-6 space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-1">Complete Payment</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pay via PayPal to activate your ad campaign
              </p>

              <div className="bg-background rounded-xl border border-border p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ad Plan</span>
                  <span className="font-medium">{formData.selectedPlan.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Reach</span>
                  <span className="font-medium">{formData.selectedPlan.reach}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-border mt-2">
                  <span>Total</span>
                  <span className="text-primary">${formData.selectedPlan.price}.00 USD</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3 mb-4 flex gap-2 text-sm text-blue-800 dark:text-blue-200">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Send payment to <strong>{PAYPAL_EMAIL}</strong> via PayPal. Include your ad title in the payment note.</span>
              </div>

              <a
                href={paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full gap-2 bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-xl h-12 text-base font-semibold">
                  <ExternalLink className="h-4 w-4" />
                  Pay ${formData.selectedPlan.price} via PayPal
                </Button>
              </a>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              After completing payment, click the button below
            </p>

            <Button
              onClick={handlePaymentDone}
              variant="outline"
              className="w-full rounded-xl"
            >
              I've completed the payment
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Pricing plans */}
            <div>
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Choose Your Plan
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {PRICING.map(plan => (
                  <button
                    key={plan.days}
                    onClick={() => setFormData(f => ({ ...f, selectedPlan: plan }))}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      formData.selectedPlan.days === plan.days
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-sm">{plan.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{plan.reach}</span>
                    </div>
                    <span className={`font-bold text-lg ${formData.selectedPlan.days === plan.days ? 'text-primary' : ''}`}>
                      ${plan.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ad content */}
            <div className="space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Ad Content
              </h2>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Ad Title *</label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="Catchy headline for your ad"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground text-right mt-0.5">{formData.title.length}/60</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="What are you promoting? Keep it clear and engaging."
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right mt-0.5">{formData.description.length}/200</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block flex items-center gap-1.5">
                  <Link className="h-3 w-3" /> Link URL (optional)
                </label>
                <Input
                  value={formData.link_url}
                  onChange={e => setFormData(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://your-website.com"
                  type="url"
                />
              </div>

              {/* Image */}
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" /> Ad Image (optional)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl h-32 cursor-pointer hover:border-primary transition-colors overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Ad preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                      <span className="text-xs">Upload image (optional)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
              </div>
            </div>

            <Button
              onClick={handleSubmitAd}
              disabled={loading || !formData.title || !formData.description}
              className="w-full rounded-xl h-12 text-base font-semibold"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Continue to Payment — $${formData.selectedPlan.price}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your ad will be reviewed within 24 hours of payment confirmation
            </p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
