import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Repeat2, AtSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api';
import { Notification } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    if (notification.thread_id) {
      navigate(`/thread/${notification.thread_id}`);
    } else if (notification.type === 'follow' && notification.actor) {
      navigate(`/profile/${notification.actor.username}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="h-5 w-5 text-red-500" />;
      case 'reply': return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'follow': return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'repost': return <Repeat2 className="h-5 w-5 text-purple-500" />;
      case 'mention': return <AtSign className="h-5 w-5 text-orange-500" />;
      case 'trending': return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      default: return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actor = notification.actor?.username || 'Someone';
    switch (notification.type) {
      case 'like': return `${actor} liked your thread`;
      case 'reply': return `${actor} replied to your thread`;
      case 'follow': return `${actor} started following you`;
      case 'repost': return `${actor} reposted your thread`;
      case 'mention': return notification.content || `${actor} mentioned you`;
      case 'trending': return notification.content || 'Your thread is trending!';
      default: return 'New notification';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b p-4 sticky top-16 glass-effect z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Notifications</h1>
            </div>
            {notifications.some(n => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {notification.actor && (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.actor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.actor.username}`} />
                          <AvatarFallback>{notification.actor.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <p className="text-sm">
                          {getNotificationText(notification)}
                        </p>
                        {notification.thread && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {notification.thread.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
