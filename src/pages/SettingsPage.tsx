import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Bell, Shield, Lock, Eye, Trash2,
  Moon, Sun, Globe, ChevronRight, LogOut, Palette,
  VolumeX, MessageSquare, BookMarked, Download, BarChart3,
  Megaphone, Key, HelpCircle, Star, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SettingRow {
  label: string;
  description?: string;
  icon: React.ReactNode;
  action?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  danger?: boolean;
  badge?: string;
  highlight?: boolean;
}

function SettingSection({ title, items }: { title: string; items: SettingRow[] }) {
  return (
    <div className="mb-2">
      <p className="px-4 pt-5 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="divide-y divide-border/60">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            disabled={!item.action && !item.toggle}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
              item.action ? 'hover:bg-accent/50 active:bg-accent/80' : 'cursor-default'
            } ${item.danger ? 'text-destructive' : ''}`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              item.danger ? 'bg-destructive/10' : item.highlight ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <span className={item.danger ? 'text-destructive' : item.highlight ? 'text-primary' : 'text-foreground'}>
                {item.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.danger ? 'text-destructive' : 'text-foreground'}`}>
                {item.label}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              )}
            </div>
            {item.badge && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                {item.badge}
              </span>
            )}
            {item.toggle ? (
              <Switch checked={item.toggle.value} onCheckedChange={item.toggle.onChange} onClick={(e) => e.stopPropagation()} />
            ) : item.action ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  const [darkMode, setDarkMode] = useState(
    savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))
  );
  const [notifications, setNotifications] = useState(localStorage.getItem('pref_notifications') !== 'false');
  const [autoplayVideos, setAutoplayVideos] = useState(localStorage.getItem('pref_autoplay') !== 'false');
  const [dataSaver, setDataSaver] = useState(localStorage.getItem('pref_datasaver') === 'true');

  const handleDarkMode = (v: boolean) => {
    setDarkMode(v);
    document.documentElement.classList.toggle('dark', v);
    localStorage.setItem('theme', v ? 'dark' : 'light');
  };

  const handleNotifications = (v: boolean) => {
    setNotifications(v);
    localStorage.setItem('pref_notifications', String(v));
  };

  const handleAutoplay = (v: boolean) => {
    setAutoplayVideos(v);
    localStorage.setItem('pref_autoplay', String(v));
  };

  const handleDataSaver = (v: boolean) => {
    setDataSaver(v);
    localStorage.setItem('pref_datasaver', String(v));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/login');
    toast({ title: 'Signed out successfully' });
  };

  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    localStorage.removeItem('feed_cache');
    toast({ title: 'Cache cleared', description: 'App cache has been cleared.' });
  };

  const handleEnablePush = async () => {
    const { requestNotificationPermission } = await import('@/lib/notifications');
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      setNotifications(true);
      localStorage.setItem('pref_notifications', 'true');
      toast({ title: 'Push notifications enabled!' });
    } else {
      toast({ title: 'Blocked', description: 'Enable notifications in browser settings.', variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      toast({ title: 'Password reset email sent!', description: `Check ${user.email}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleBlockedUsers = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('*, user:blocked_user_id(username)')
      .eq('user_id', authUser.id);
    if (!blocked || blocked.length === 0) {
      toast({ title: 'No blocked users' });
    } else {
      toast({ title: `${blocked.length} blocked user(s)`, description: 'Manage from user profiles' });
    }
  };

  const accountItems: SettingRow[] = [
    {
      label: 'Edit Profile',
      description: 'Update name, bio, avatar, website',
      icon: <User className="h-4 w-4" />,
      action: () => navigate('/profile/edit'),
    },
    {
      label: 'Change Password',
      description: 'Update your account password',
      icon: <Key className="h-4 w-4" />,
      action: handleChangePassword,
    },
    {
      label: 'Privacy',
      description: 'Control who sees your content',
      icon: <Eye className="h-4 w-4" />,
      action: () => toast({ title: 'Coming soon', description: 'Privacy controls are being built.' }),
    },
    {
      label: 'Blocked Users',
      description: 'Manage blocked accounts',
      icon: <Shield className="h-4 w-4" />,
      action: handleBlockedUsers,
    },
    {
      label: 'Followers & Following',
      description: 'Manage your connections',
      icon: <Users className="h-4 w-4" />,
      action: () => navigate(`/profile/${user?.username}`),
    },
  ];

  const creatorItems: SettingRow[] = [
    {
      label: 'Creator Analytics',
      description: 'Views, engagement, top content',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate('/analytics'),
      highlight: true,
    },
    {
      label: 'Promote Content',
      description: 'Advertise to reach more users',
      icon: <Megaphone className="h-4 w-4" />,
      action: () => navigate('/create-ad'),
      highlight: true,
    },
  ];

  const appearanceItems: SettingRow[] = [
    {
      label: 'Dark Mode',
      description: 'Switch between light and dark theme',
      icon: darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />,
      toggle: { value: darkMode, onChange: handleDarkMode },
    },
    {
      label: 'Language',
      description: 'English (US)',
      icon: <Globe className="h-4 w-4" />,
      action: () => toast({ title: 'Coming soon', description: 'More languages coming.' }),
    },
  ];

  const notifItems: SettingRow[] = [
    {
      label: 'Push Notifications',
      description: 'Get notified about likes, replies, follows',
      icon: <Bell className="h-4 w-4" />,
      toggle: { value: notifications, onChange: (v) => { handleNotifications(v); if (v) handleEnablePush(); } },
    },
    {
      label: 'Message Alerts',
      description: 'Direct message notifications',
      icon: <MessageSquare className="h-4 w-4" />,
      toggle: { value: notifications, onChange: handleNotifications },
    },
    {
      label: 'Muted Words',
      description: 'Filter content by keywords',
      icon: <VolumeX className="h-4 w-4" />,
      action: () => toast({ title: 'Coming soon', description: 'Keyword filtering is being built.' }),
    },
  ];

  const mediaItems: SettingRow[] = [
    {
      label: 'Autoplay Videos',
      description: 'Play videos automatically in feed',
      icon: <VideoIcon />,
      toggle: { value: autoplayVideos, onChange: handleAutoplay },
    },
    {
      label: 'Data Saver',
      description: 'Reduce data & load times on slow networks',
      icon: <Download className="h-4 w-4" />,
      toggle: { value: dataSaver, onChange: handleDataSaver },
    },
    {
      label: 'Saved / Bookmarks',
      description: 'View your saved threads',
      icon: <BookMarked className="h-4 w-4" />,
      action: () => navigate('/bookmarks'),
    },
  ];

  const dangerItems: SettingRow[] = [
    {
      label: 'Clear Cache',
      description: 'Free up storage, reload fresh data',
      icon: <Trash2 className="h-4 w-4" />,
      action: handleClearCache,
    },
    {
      label: 'Sign Out',
      description: `Signed in as ${user?.email}`,
      icon: <LogOut className="h-4 w-4" />,
      action: handleLogout,
      danger: true,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28">
        {/* User Card */}
        <div
          className="bg-card border-b border-border px-4 py-4 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => navigate(`/profile/${user?.username}`)}
        >
          <Avatar className="h-14 w-14">
            <AvatarImage src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
            <AvatarFallback className="h-14 w-14 bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-bold text-xl">
              {user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{user?.username}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <SettingSection title="Account" items={accountItems} />
        <SettingSection title="Creator Tools" items={creatorItems} />
        <SettingSection title="Appearance" items={appearanceItems} />
        <SettingSection title="Notifications" items={notifItems} />
        <SettingSection title="Media & Content" items={mediaItems} />
        <SettingSection title="Danger Zone" items={dangerItems} />

        <div className="px-4 py-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">ThreadsClone v2.0</p>
          <div className="flex items-center gap-4">
            <button className="text-xs text-muted-foreground hover:text-foreground">Privacy Policy</button>
            <button className="text-xs text-muted-foreground hover:text-foreground">Terms of Service</button>
            <button className="text-xs text-muted-foreground hover:text-foreground">Help</button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function VideoIcon() {
  return (
    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 8-6 4 6 4V8z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}
