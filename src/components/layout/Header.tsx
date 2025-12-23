import { useState, useEffect } from 'react';
import { AtSign, LogOut, Shield } from 'lucide-react';
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
import { isAdmin } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const adminStatus = await isAdmin();
    setIsAdminUser(adminStatus);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b glass-effect">
      <div className="container flex h-16 items-center justify-between px-4">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <AtSign className="h-8 w-8" />
          <h1 className="text-2xl font-bold">threads</h1>
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                  <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline">@{user.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile/edit')}>
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isAdminUser && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
