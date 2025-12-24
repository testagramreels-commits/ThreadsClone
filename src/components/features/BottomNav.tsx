import { Home, Search, PenSquare, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t glass-effect md:hidden">
      <div className="flex items-center justify-around h-16 px-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 ${isActive('/') ? '' : 'text-muted-foreground'}`}
          onClick={() => {
            if (isActive('/')) {
              scrollToTop();
            } else {
              navigate('/');
            }
          }}
        >
          <Home className="h-6 w-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 ${isActive('/search') ? '' : 'text-muted-foreground'}`}
          onClick={() => navigate('/search')}
        >
          <Search className="h-6 w-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-12 w-12 text-muted-foreground"
          onClick={scrollToTop}
        >
          <PenSquare className="h-6 w-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 ${isActive('/trending') ? '' : 'text-muted-foreground'}`}
          onClick={() => navigate('/trending')}
        >
          <TrendingUp className="h-6 w-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 ${isActive(`/profile/${user?.username}`) ? '' : 'text-muted-foreground'}`}
          onClick={() => {
            if (user?.username) {
              navigate(`/profile/${user.username}`);
            } else {
              navigate('/login');
            }
          }}
        >
          <User className="h-6 w-6" />
        </Button>
      </div>
    </nav>
  );
}
