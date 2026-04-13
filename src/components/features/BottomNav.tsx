import { Home, Search, PenSquare, Bell, User, Video } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { getUnreadNotificationsCount } from '@/lib/api';
import { CreateThread } from './CreateThread';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (!user) return;
    getUnreadNotificationsCount().then(setUnread);
    const interval = setInterval(() => {
      getUnreadNotificationsCount().then(setUnread);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
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
    {
      icon: PenSquare,
      label: 'Post',
      path: '__create__',
      action: () => setShowCreate(true),
    },
    {
      icon: Video,
      label: 'Videos',
      path: '/videos',
      action: () => navigate('/videos'),
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
      path: user?.username ? `/profile/${user.username}` : '/login',
      action: () => navigate(user?.username ? `/profile/${user.username}` : '/login'),
    },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-14 px-1 max-w-2xl mx-auto">
          {navItems.map(({ icon: Icon, label, path, action, badge }) => {
            const active = path !== '__create__' && isActive(path);
            return (
              <button
                key={label}
                onClick={action}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 rounded-xl transition-all relative ${
                  path === '__create__'
                    ? 'bg-foreground text-background rounded-full w-10 h-10 flex-shrink-0 shadow-lg'
                    : active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {path === '__create__' ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <>
                    <div className="relative">
                      <Icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                      {badge && badge > 0 ? (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : null}
                    </div>
                    <span className={`text-[10px] font-medium ${active ? 'text-foreground' : ''}`}>
                      {label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <CreateThread
            onThreadCreated={() => setShowCreate(false)}
            compact
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
