import { useState, useEffect, useRef } from 'react';
import { AtSign, LogOut, Shield, Bell, MessageCircle, Bookmark, Moon, Sun, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authService } from '@/lib/auth';
import { isAdmin, getUnreadNotificationsCount } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && document.documentElement.classList.contains('dark'));
  });

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return { dark, toggle };
}

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { dark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    // Apply saved theme on mount
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else if (saved === 'light') document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    checkAdmin();
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAdmin = async () => {
    const adminStatus = await isAdmin();
    setIsAdminUser(adminStatus);
  };

  const loadUnreadCount = async () => {
    const count = await getUnreadNotificationsCount();
    setUnreadCount(count);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b glass-effect">
      <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
        <button
          className="flex items-center gap-2 font-bold text-xl"
          onClick={() => navigate('/')}
        >
          <AtSign className="h-6 w-6" />
          <span className="hidden sm:inline">threads</span>
        </button>

        {user && (
          <div className="flex items-center gap-1">
            {/* Dark Mode Toggle */}
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={toggleDark}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Messages */}
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative" onClick={() => navigate('/messages')}>
              <MessageCircle className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative" onClick={() => navigate('/notifications')}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Avatar Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                    <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">@{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)}>
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile/edit')}>
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/bookmarks')}>
                  <Bookmark className="mr-2 h-4 w-4" /> Bookmarks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdminUser && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
