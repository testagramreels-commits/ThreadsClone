import { AtSign, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { user } = useAuth();
  const { toast } = useToast();

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
        <div className="flex items-center gap-2">
          <AtSign className="h-8 w-8" />
          <h1 className="text-2xl font-bold">threads</h1>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">@{user.username}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
