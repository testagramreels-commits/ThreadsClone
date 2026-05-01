import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, FileText, Heart, MessageCircle,
  Share2, Video, TrendingUp, BarChart3, Plus, Edit, Trash2,
  HardDrive, CheckCircle, XCircle, DollarSign, Eye, Clock,
  Megaphone, RefreshCw, UserCheck, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BottomNav } from '@/components/features/BottomNav';
import { isAdmin, getPlatformAnalytics, getAllAds, createAd, updateAd, deleteAd } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { AdPlacement, UserAd } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PlatformStats {
  totalUsers: number;
  totalThreads: number;
  totalLikes: number;
  totalReplies: number;
  totalFollows: number;
  videoThreads: number;
}

type AdminTab = 'overview' | 'ads' | 'user-ads' | 'storage';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [backblazeStatus, setBackblazeStatus] = useState<'checking' | 'configured' | 'not-configured'>('checking');
  const [adForm, setAdForm] = useState({
    name: '',
    ad_code: '',
    position: 'feed' as 'feed' | 'sidebar' | 'profile' | 'video',
  });

  useEffect(() => { checkAccess(); }, []);

  const checkAccess = async () => {
    try {
      const adminStatus = await isAdmin();
      if (!adminStatus) {
        toast({ title: 'Access Denied', variant: 'destructive' });
        navigate('/');
        return;
      }
      setHasAccess(true);
      await Promise.all([loadStats(), loadAds(), loadUserAds()]);
      checkBackblazeStatus();
    } catch (error: any) {
      navigate('/');
    }
  };

  const checkBackblazeStatus = async () => {
    try {
      const { isBackblazeConfigured } = await import('@/lib/backblaze');
      const configured = await isBackblazeConfigured();
      setBackblazeStatus(configured ? 'configured' : 'not-configured');
    } catch { setBackblazeStatus('not-configured'); }
  };

  const loadStats = async () => {
    try {
      const data = await getPlatformAnalytics();
      setStats(data);
    } finally { setLoading(false); }
  };

  const loadAds = async () => {
    try {
      const data = await getAllAds();
      setAds(data);
    } catch (e) { console.error(e); }
  };

  const loadUserAds = async () => {
    try {
      const { data } = await supabase
        .from('user_ads')
        .select('*, user:user_id(id, username, email, avatar_url)')
        .order('created_at', { ascending: false });
      setUserAds((data || []) as UserAd[]);
    } catch (e) { console.error(e); }
  };

  const handleApproveUserAd = async (adId: string) => {
    try {
      await supabase.from('user_ads').update({
        status: 'active',
        starts_at: new Date().toISOString(),
      }).eq('id', adId);
      toast({ title: 'Ad approved and activated!' });
      loadUserAds();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleRejectUserAd = async (adId: string) => {
    if (!confirm('Reject this ad?')) return;
    try {
      await supabase.from('user_ads').update({ status: 'rejected' }).eq('id', adId);
      toast({ title: 'Ad rejected' });
      loadUserAds();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveAd = async () => {
    try {
      if (editingAd) {
        await updateAd(editingAd.id, adForm);
        toast({ title: 'Ad updated!' });
      } else {
        await createAd(adForm.name, adForm.ad_code, adForm.position);
        toast({ title: 'Ad created!' });
      }
      setShowAdDialog(false);
      loadAds();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'ads', label: 'Ad System', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'user-ads', label: `User Ads ${userAds.filter(a => a.status === 'pending').length > 0 ? `(${userAds.filter(a => a.status === 'pending').length})` : ''}`, icon: <Megaphone className="h-4 w-4" /> },
    { key: 'storage', label: 'Storage', icon: <HardDrive className="h-4 w-4" /> },
  ];

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const pendingUserAds = userAds.filter(a => a.status === 'pending');
  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: <Users className="h-5 w-5 text-blue-500" />, color: 'text-blue-500' },
    { label: 'Total Threads', value: stats.totalThreads.toLocaleString(), icon: <FileText className="h-5 w-5 text-green-500" />, color: 'text-green-500' },
    { label: 'Total Likes', value: stats.totalLikes.toLocaleString(), icon: <Heart className="h-5 w-5 text-red-500" />, color: 'text-red-500' },
    { label: 'Total Replies', value: stats.totalReplies.toLocaleString(), icon: <MessageCircle className="h-5 w-5 text-purple-500" />, color: 'text-purple-500' },
    { label: 'Total Follows', value: stats.totalFollows.toLocaleString(), icon: <Share2 className="h-5 w-5 text-orange-500" />, color: 'text-orange-500' },
    { label: 'Video Threads', value: stats.videoThreads.toLocaleString(), icon: <Video className="h-5 w-5 text-cyan-500" />, color: 'text-cyan-500' },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-base">Admin Dashboard</h1>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => { loadStats(); loadAds(); loadUserAds(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto flex overflow-x-auto scrollbar-hide px-2 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto pb-28 p-4">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {statCards.map((card, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      {card.icon}
                      <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {pendingUserAds.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Clock className="h-4 w-4" />
                    {pendingUserAds.length} Ad{pendingUserAds.length > 1 ? 's' : ''} Awaiting Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('user-ads')}>
                    Review Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ADS SYSTEM */}
        {activeTab === 'ads' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ad Placements</CardTitle>
                  <CardDescription>Manage Google AdSense & custom ads</CardDescription>
                </div>
                <Button onClick={() => { setEditingAd(null); setAdForm({ name: '', ad_code: '', position: 'feed' }); setShowAdDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ad
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-sm">No ads configured yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ads.map(ad => (
                    <div key={ad.id} className="border border-border/60 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{ad.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ad.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{ad.position}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateAd(ad.id, { is_active: !ad.is_active }).then(() => { toast({ title: ad.is_active ? 'Deactivated' : 'Activated' }); loadAds(); })}>
                            {ad.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingAd(ad); setAdForm({ name: ad.name, ad_code: ad.ad_code, position: ad.position }); setShowAdDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAd(ad.id).then(() => { toast({ title: 'Deleted' }); loadAds(); })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate bg-muted/50 px-2 py-1 rounded">
                        {ad.ad_code.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* USER ADS */}
        {activeTab === 'user-ads' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">User Promoted Ads</h2>
              <span className="text-xs text-muted-foreground">{userAds.length} total</span>
            </div>

            {userAds.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-3" />
                <p className="font-medium">No user ads yet</p>
                <p className="text-sm mt-1">When users create ads, they'll appear here for review</p>
              </div>
            ) : (
              userAds.map(ad => (
                <Card key={ad.id} className={ad.status === 'pending' ? 'border-amber-200 dark:border-amber-800' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{ad.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                            ad.status === 'active' ? 'bg-green-100 text-green-700' :
                            ad.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            ad.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {ad.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{ad.description}</p>
                        {ad.image_url && (
                          <img src={ad.image_url} alt={ad.title} className="h-20 w-full object-cover rounded-lg mb-2" />
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${ad.budget_usd} · {ad.duration_days}d</span>
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{ad.impressions} impressions</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    {ad.status === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-border/60">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleApproveUserAd(ad.id)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Approve & Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 text-destructive"
                          onClick={() => handleRejectUserAd(ad.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* STORAGE */}
        {activeTab === 'storage' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Status
              </CardTitle>
              <CardDescription>Backblaze B2 cloud storage for videos and media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-border/60 rounded-xl">
                {backblazeStatus === 'checking' && <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />}
                {backblazeStatus === 'configured' && <CheckCircle className="h-8 w-8 text-green-600" />}
                {backblazeStatus === 'not-configured' && <XCircle className="h-8 w-8 text-red-500" />}
                <div>
                  <p className="font-semibold">
                    {backblazeStatus === 'checking' && 'Checking...'}
                    {backblazeStatus === 'configured' && 'Backblaze B2 Connected ✓'}
                    {backblazeStatus === 'not-configured' && 'Not Connected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {backblazeStatus === 'configured' && 'Unlimited video storage active'}
                    {backblazeStatus === 'not-configured' && 'Using Supabase storage (limited)'}
                  </p>
                </div>
              </div>
              {backblazeStatus === 'configured' && (
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-xl text-sm text-green-800 dark:text-green-200">
                  ✓ All video uploads use Backblaze B2 with CDN delivery for fast loading
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Ad Dialog */}
      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Edit Ad' : 'Add New Ad'}</DialogTitle>
            <DialogDescription>Configure your Google AdSense or custom ad placement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ad Name</Label>
              <Input value={adForm.name} onChange={e => setAdForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Feed Banner" />
            </div>
            <div>
              <Label>Position</Label>
              <Select value={adForm.position} onValueChange={(v: any) => setAdForm(f => ({ ...f, position: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed (between posts)</SelectItem>
                  <SelectItem value="profile">Profile pages</SelectItem>
                  <SelectItem value="video">Video pages</SelectItem>
                  <SelectItem value="sidebar">Sidebar (desktop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ad Code</Label>
              <Textarea
                value={adForm.ad_code}
                onChange={e => setAdForm(f => ({ ...f, ad_code: e.target.value }))}
                placeholder="Paste your AdSense code here..."
                className="font-mono text-xs min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAd} disabled={!adForm.name || !adForm.ad_code}>
              {editingAd ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
