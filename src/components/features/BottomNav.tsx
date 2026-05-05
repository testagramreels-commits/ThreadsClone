import { Home, Search, PenSquare, Bell, User, Video } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { getUnreadNotificationsCount } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateThread } from './CreateThread';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollY.current;
        // Only trigger after scrolling 10px to avoid jitter
        if (Math.abs(diff) > 10) {
          setVisible(diff < 0 || currentY < 60);
          lastScrollY.current = currentY;
        }
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    getUnreadNotificationsCount().then(setUnread);
    const interval = setInterval(() => {
      getUnreadNotificationsCount().then(setUnread);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Hide on video page for true immersive TikTok experience
  if (location.pathname === '/videos') return null;

  const leftItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      action: () => {
        if (isActive('/')) window.scrollTo({ top: 0, behavior: 'smooth' });
        else navigate('/');
      },
    },
    {
      icon: Search,
      label: 'Search',
      path: '/search',
      action: () => navigate('/search'),
    },
  ];

  const rightItems = [
    {
      icon: Video,
      label: 'Videos',
      path: '/videos',
      action: () => navigate('/videos'),
      badge: 0,
    },
    {
      icon: Bell,
      label: 'Activity',
      path: '/activity',
      action: () => navigate('/activity'),
      badge: unread,
    },
    {
      icon: User,
      label: 'Profile',
      path: user?.username ? `/profile/${user.username}` : user?.id ? `/profile/${user.id}` : '/login',
      action: () => navigate(user?.username ? `/profile/${user.username}` : user?.id ? `/profile/${user.id}` : '/login'),
      badge: 0,
    },
  ];

  const NavButton = ({
    icon: Icon,
    label,
    path,
    action,
    badge = 0,
  }: {
    icon: React.ElementType;
    label: string;
    path: string;
    action: () => void;
    badge?: number;
  }) => {
    const active = isActive(path);
    return (
      <button
        onClick={action}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all active:scale-90 relative ${
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="relative">
          <Icon
            className={`h-[22px] w-[22px] transition-all duration-200 ${active ? 'scale-110' : ''}`}
            strokeWidth={active ? 2.5 : 1.8}
          />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-medium transition-colors leading-none ${active ? 'text-foreground' : ''}`}>
          {label}
        </span>
        {active && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-foreground rounded-t-full" />
        )}
      </button>
    );
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/96 backdrop-blur-xl border-t border-border/50 transition-transform duration-300 ease-in-out"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div className="flex items-center h-14 max-w-2xl mx-auto px-1">
          {leftItems.map(item => (
            <NavButton key={item.label} {...item} />
          ))}

          {/* Center Create Button */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 px-3">
            <button
              onClick={() => setShowCreate(true)}
              className="h-[46px] w-[46px] bg-foreground rounded-[14px] flex items-center justify-center shadow-lg transition-all active:scale-90 hover:opacity-85"
              aria-label="Create thread"
            >
              <PenSquare className="h-5 w-5 text-background" strokeWidth={2} />
            </button>
          </div>

          {rightItems.map(item => (
            <NavButton key={item.label} {...item} />
          ))}
        </div>
      </nav>

      {/* Quick Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Thread</DialogTitle>
          </DialogHeader>
          <CreateThread onThreadCreated={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
