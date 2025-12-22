import { Home, Search, PenSquare, Heart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t glass-effect md:hidden">
      <div className="flex items-center justify-around h-16 px-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 ${isActive('/') ? '' : 'text-muted-foreground'}`}
          onClick={() => navigate('/')}
        >
          <Home className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground">
          <Search className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground">
          <PenSquare className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground">
          <Heart className="h-6 w-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-12 w-12 ${isActive(`/profile/${user?.username}`) ? '' : 'text-muted-foreground'}`}
          onClick={() => user && navigate(`/profile/${user.username}`)}
        >
          <User className="h-6 w-6" />
        </Button>
      </div>
    </nav>
  );
}
