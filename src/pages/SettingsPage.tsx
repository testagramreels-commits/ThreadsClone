import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Bell, Shield, Lock, Eye, Trash2,
  Moon, Sun, Globe, ChevronRight, LogOut, Palette,
  VolumeX, MessageSquare, BookMarked, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
}

function SettingSection({ title, items }: { title: string; items: SettingRow[] }) {
  return (
    <div className="mb-2">
      <p className="px-4 pt-5 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="bg-card border-y border-border divide-y divide-border">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            disabled={!item.action && !item.toggle}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
              item.action ? 'hover:bg-accent active:bg-accent/80' : 'cursor-default'
            } ${item.danger ? 'text-destructive' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              item.danger ? 'bg-destructive/10' : 'bg-muted'
            }`}>
              {item.icon}
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
              <Switch
                checked={item.toggle.value}
                onCheckedChange={item.toggle.onChange}
                onClick={(e) => e.stopPropagation()}
              />
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

  // Preferences stored locally
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  const [darkMode, setDarkMode] = useState(
    savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem('pref_notifications') !== 'false'
  );
  const [autoplayVideos, setAutoplayVideos] = useState(
    localStorage.getItem('pref_autoplay') !== 'false'
  );
  const [dataSaver, setDataSaver] = useState(
    localStorage.getItem('pref_datasaver') === 'true'
  );
  const [privateAccount, setPrivateAccount] = useState(false);

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
    toast({ title: 'Signed out', description: 'You have been logged out.' });
  };

  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    toast({ title: 'Cache cleared', description: 'App cache has been cleared.' });
  };

  const accountItems: SettingRow[] = [
    {
      label: 'Edit Profile',
      description: 'Update name, bio, avatar',
      icon: <User className="h-4 w-4" />,
      action: () => navigate('/profile/edit'),
    },
    {
      label: 'Privacy',
      description: 'Control who sees your content',
      icon: <Eye className="h-4 w-4" />,
      action: () => toast({ title: 'Privacy', description: 'Advanced privacy controls coming soon.' }),
    },
    {
      label: 'Security',
      description: 'Password, sessions',
      icon: <Lock className="h-4 w-4" />,
      action: () => toast({ title: 'Security', description: 'Security settings coming soon.' }),
    },
    {
      label: 'Blocked Users',
      description: 'Manage blocked accounts',
      icon: <Shield className="h-4 w-4" />,
      action: () => toast({ title: 'Blocked', description: 'Block list management coming soon.' }),
    },
  ];

  const appearanceItems: SettingRow[] = [
    {
      label: 'Dark Mode',
      description: 'Switch between light and dark',
      icon: darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />,
      toggle: { value: darkMode, onChange: handleDarkMode },
    },
    {
      label: 'App Theme',
      description: 'Customize colours',
      icon: <Palette className="h-4 w-4" />,
      action: () => toast({ title: 'Themes', description: 'Custom themes coming soon.' }),
      badge: 'Soon',
    },
    {
      label: 'Language',
      description: 'English (US)',
      icon: <Globe className="h-4 w-4" />,
      action: () => toast({ title: 'Language', description: 'Multi-language support coming soon.' }),
    },
  ];

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

  const notifItems: SettingRow[] = [
    {
      label: 'Push Notifications',
      description: 'Likes, replies, follows in real-time',
      icon: <Bell className="h-4 w-4" />,
      toggle: { value: notifications, onChange: (v) => { handleNotifications(v); if (v) handleEnablePush(); } },
    },
    {
      label: 'Messages',
      description: 'Direct message alerts',
      icon: <MessageSquare className="h-4 w-4" />,
      toggle: { value: notifications, onChange: handleNotifications },
    },
    {
      label: 'Muted Words',
      description: 'Filter content by keywords',
      icon: <VolumeX className="h-4 w-4" />,
      action: () => toast({ title: 'Muted words', description: 'Keyword filtering coming soon.' }),
    },
  ];

  const mediaItems: SettingRow[] = [
    {
      label: 'Autoplay Videos',
      description: 'Play videos automatically',
      icon: <Video className="h-4 w-4" />,
      toggle: { value: autoplayVideos, onChange: handleAutoplay },
    },
    {
      label: 'Data Saver',
      description: 'Reduce data usage',
      icon: <Download className="h-4 w-4" />,
      toggle: { value: dataSaver, onChange: handleDataSaver },
    },
    {
      label: 'Saved / Bookmarks',
      description: 'View saved threads',
      icon: <BookMarked className="h-4 w-4" />,
      action: () => navigate('/bookmarks'),
    },
  ];

  const dangerItems: SettingRow[] = [
    {
      label: 'Clear Cache',
      description: 'Free up storage',
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
      {/* Header */}
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
        <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">@{user?.username}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile/edit')} className="rounded-full text-xs">
            Edit
          </Button>
        </div>

        <SettingSection title="Account" items={accountItems} />
        <SettingSection title="Appearance" items={appearanceItems} />
        <SettingSection title="Notifications" items={notifItems} />
        <SettingSection title="Media & Content" items={mediaItems} />
        <SettingSection title="Danger Zone" items={dangerItems} />

        <p className="text-center text-xs text-muted-foreground py-6">
          ThreadsClone v1.0 · Built with OnSpace
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

// Needed for Video icon used inside settings
function Video({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 8-6 4 6 4V8z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}
