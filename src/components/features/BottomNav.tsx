import { Home, Search, PenSquare, Bell, User, Video, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { getUnreadNotificationsCount } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateThread } from './CreateThread';

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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60">
        <div className="flex items-center justify-around max-w-2xl mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {navItems.map(({ icon: Icon, label, path, action, badge }) => {
            const active = path !== '__create__' && isActive(path);
            const isCreate = path === '__create__';
            return (
              <button
                key={label}
                onClick={action}
                style={{ minHeight: 56, minWidth: 56 }}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 rounded-xl transition-all relative ${
                  isCreate
                    ? 'bg-foreground rounded-full mx-2 h-10 w-10 shadow-lg flex-shrink-0'
                    : active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground active:scale-90'
                }`}
              >
                {isCreate ? (
                  <Icon className="h-5 w-5 text-background" />
                ) : (
                  <>
                    <div className="relative">
                      <Icon className={`h-5 w-5 transition-all duration-200 ${active ? 'scale-110 stroke-[2.5]' : ''}`} />
                      {badge && badge > 0 ? (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : null}
                      {active && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                      )}
                    </div>
                    <span className={`text-[9px] font-medium transition-colors ${active ? 'text-foreground' : ''}`}>
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
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Thread</DialogTitle>
          </DialogHeader>
          <CreateThread
            onThreadCreated={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
