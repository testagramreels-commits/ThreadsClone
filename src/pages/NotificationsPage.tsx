import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Repeat2, AtSign, TrendingUp, Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api';
import { Notification } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  isPushSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/notifications';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    loadNotifications();
    if (isPushSupported()) {
      setPushPermission(getNotificationPermission());
    }
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    setRequestingPush(true);
    const permission = await requestNotificationPermission();
    setPushPermission(permission);
    setRequestingPush(false);
    if (permission === 'granted') {
      toast({ title: 'Notifications enabled!', description: 'You will receive alerts for likes, follows & replies.' });
    } else {
      toast({ title: 'Notifications blocked', description: 'Enable them in your browser settings.', variant: 'destructive' });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    }
    if (notification.thread_id) navigate(`/thread/${notification.thread_id}`);
    else if (notification.type === 'follow' && notification.actor) navigate(`/profile/${notification.actor.username}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({ title: 'All caught up!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':    return <Heart className="h-4 w-4 text-red-500 fill-current" />;
      case 'reply':   return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':  return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'repost':  return <Repeat2 className="h-4 w-4 text-purple-500" />;
      case 'mention': return <AtSign className="h-4 w-4 text-orange-500" />;
      case 'trending':return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getText = (n: Notification) => {
    const actor = n.actor?.username || 'Someone';
    switch (n.type) {
      case 'like':    return `${actor} liked your thread`;
      case 'reply':   return `${actor} replied to your thread`;
      case 'follow':  return `${actor} started following you`;
      case 'repost':  return `${actor} reposted your thread`;
      case 'mention': return n.content || `${actor} mentioned you`;
      case 'trending':return n.content || 'Your thread is trending!';
      default: return 'New notification';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto pb-24">
        {/* Sticky header */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Push notification prompt */}
        {isPushSupported() && pushPermission === 'default' && (
          <div className="mx-4 mt-4 p-4 rounded-2xl border border-border bg-primary/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Enable notifications</p>
              <p className="text-xs text-muted-foreground">Get alerts for likes, follows & replies</p>
            </div>
            <Button size="sm" onClick={handleEnablePush} disabled={requestingPush} className="rounded-full flex-shrink-0 text-xs">
              {requestingPush ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enable'}
            </Button>
          </div>
        )}

        {pushPermission === 'denied' && (
          <div className="mx-4 mt-4 p-3 rounded-xl border border-border/60 flex items-center gap-2 text-muted-foreground">
            <BellOff className="h-4 w-4 flex-shrink-0" />
            <p className="text-xs">Notifications are blocked. Enable them in browser settings.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-bold text-lg mb-1">All caught up!</p>
            <p className="text-sm text-muted-foreground">Notifications will appear here when someone interacts with you.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 mt-2">
            {notifications.map(n => (
              <button
                key={n.id}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 ${!n.is_read ? 'bg-primary/5' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                {/* Icon badge */}
                <div className="flex-shrink-0 relative mt-0.5">
                  {n.actor ? (
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={n.actor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor.username}`} />
                        <AvatarFallback className="text-sm font-bold">{n.actor.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center border border-border">
                        {getIcon(n.type)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getIcon(n.type)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{getText(n)}</span>
                  </p>
                  {n.thread && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.thread.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>

                {!n.is_read && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
