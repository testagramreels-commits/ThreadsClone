import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, FileText, Heart, MessageCircle, 
  Share2, Video, TrendingUp, BarChart3, Plus, Edit, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { isAdmin, getPlatformAnalytics, getAllAds, createAd, updateAd, deleteAd } from '@/lib/api';
import { AdPlacement } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface PlatformStats {
  totalUsers: number;
  totalThreads: number;
  totalLikes: number;
  totalReplies: number;
  totalFollows: number;
  videoThreads: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [adForm, setAdForm] = useState({
    name: '',
    ad_code: '',
    position: 'feed' as 'feed' | 'sidebar' | 'profile' | 'video',
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const adminStatus = await isAdmin();
      if (!adminStatus) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      setHasAccess(true);
      await loadStats();
      await loadAds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const loadStats = async () => {
    try {
      const data = await getPlatformAnalytics();
      setStats(data);
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

  const loadAds = async () => {
    try {
      const data = await getAllAds();
      setAds(data);
    } catch (error: any) {
      console.error('Failed to load ads:', error);
    }
  };

  const handleCreateAd = () => {
    setEditingAd(null);
    setAdForm({
      name: '',
      ad_code: '',
      position: 'feed',
    });
    setShowAdDialog(true);
  };

  const handleEditAd = (ad: AdPlacement) => {
    setEditingAd(ad);
    setAdForm({
      name: ad.name,
      ad_code: ad.ad_code,
      position: ad.position,
    });
    setShowAdDialog(true);
  };

  const handleSaveAd = async () => {
    try {
      if (editingAd) {
        await updateAd(editingAd.id, adForm);
        toast({
          title: 'Success',
          description: 'Ad updated successfully',
        });
      } else {
        await createAd(adForm.name, adForm.ad_code, adForm.position);
        toast({
          title: 'Success',
          description: 'Ad created successfully',
        });
      }
      setShowAdDialog(false);
      loadAds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    
    try {
      await deleteAd(adId);
      toast({
        title: 'Success',
        description: 'Ad deleted successfully',
      });
      loadAds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleAd = async (ad: AdPlacement) => {
    try {
      await updateAd(ad.id, { is_active: !ad.is_active });
      toast({
        title: 'Success',
        description: ad.is_active ? 'Ad deactivated' : 'Ad activated',
      });
      loadAds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-6xl mx-auto pb-20 md:pb-4 p-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform analytics and insights</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Threads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalThreads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Posts created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Video Threads</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.videoThreads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalThreads ? 
                  `${Math.round((stats.videoThreads / stats.totalThreads) * 100)}% of all threads` 
                  : '0% of all threads'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLikes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {stats?.totalThreads ? (stats.totalLikes / stats.totalThreads).toFixed(1) : '0'} per thread
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Replies</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReplies.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {stats?.totalThreads ? (stats.totalReplies / stats.totalThreads).toFixed(1) : '0'} per thread
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Follows</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFollows.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {stats?.totalUsers ? (stats.totalFollows / stats.totalUsers).toFixed(1) : '0'} per user
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AdSense Management</CardTitle>
                <CardDescription>Manage your Google AdSense ad placements</CardDescription>
              </div>
              <Button onClick={handleCreateAd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ad
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {ads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No ads configured yet. Click "Add Ad" to create your first ad placement.
              </p>
            ) : (
              <div className="space-y-4">
                {ads.map((ad) => (
                  <div key={ad.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{ad.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ad.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {ad.position}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">
                          {ad.ad_code.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAd(ad)}
                        >
                          {ad.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditAd(ad)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteAd(ad.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google AdSense Setup Guide</CardTitle>
            <CardDescription>How to get started with AdSense monetization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Sign up for Google AdSense at <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">google.com/adsense</a></li>
                <li>Get approved and receive your AdSense publisher ID</li>
                <li>Create ad units in your AdSense dashboard</li>
                <li>Copy the ad code from AdSense</li>
                <li>Paste the ad code here by clicking "Add Ad" above</li>
                <li>Choose the position where you want the ad to appear</li>
                <li>Ads will automatically display on your platform</li>
              </ol>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Recommended Ad Positions:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Feed:</strong> Between threads in the main feed (appears after every 7 posts)</li>
                  <li><strong>Profile:</strong> Below user profile information</li>
                  <li><strong>Video:</strong> Before or after video content</li>
                  <li><strong>Sidebar:</strong> Fixed position on desktop sidebar (desktop only)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Edit Ad' : 'Add New Ad'}</DialogTitle>
            <DialogDescription>
              Paste your Google AdSense code below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Ad Name</Label>
              <Input
                id="name"
                value={adForm.name}
                onChange={(e) => setAdForm({ ...adForm, name: e.target.value })}
                placeholder="e.g., Homepage Banner"
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Select
                value={adForm.position}
                onValueChange={(value: 'feed' | 'sidebar' | 'profile' | 'video') =>
                  setAdForm({ ...adForm, position: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed (between posts)</SelectItem>
                  <SelectItem value="profile">Profile (user pages)</SelectItem>
                  <SelectItem value="video">Video (video pages)</SelectItem>
                  <SelectItem value="sidebar">Sidebar (desktop only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ad_code">AdSense Code</Label>
              <Textarea
                id="ad_code"
                value={adForm.ad_code}
                onChange={(e) => setAdForm({ ...adForm, ad_code: e.target.value })}
                placeholder="Paste your AdSense code here..."
                className="font-mono text-xs min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdDialog(false)}>
              Cancel
            </Button>
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
