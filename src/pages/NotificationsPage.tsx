import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Repeat2, AtSign, TrendingUp, Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/features/BottomNav';
import { getNotifications, markAllNotificationsAsRead } from '@/lib/api';
import type { Notification as AppNotification } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { isPushSupported, requestNotificationPermission, getNotificationPermission } from '@/lib/notifications';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [requestingPush, setRequestingPush] = useState(false);

  useEffect(() => {
    loadAndMarkAllRead();
    if (isPushSupported()) {
      setPushPermission(getNotificationPermission());
    }
  }, []);

  const loadAndMarkAllRead = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data.map(n => ({ ...n, is_read: true })));
      // Mark all as read silently in background
      if (data.some(n => !n.is_read)) {
        markAllNotificationsAsRead().catch(console.error);
      }
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
      // Send a test notification
      if ('Notification' in window) {
        new Notification('Notifications enabled!', {
          body: 'You will now receive alerts for activity on your account.',
          icon: '/manifest.json',
        });
      }
    } else {
      toast({ title: 'Notifications blocked', description: 'Enable them in your browser settings.', variant: 'destructive' });
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (notification.thread_id) navigate(`/thread/${notification.thread_id}`);
    else if (notification.type === 'follow' && notification.actor) navigate(`/profile/${notification.actor.username}`);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'like':    return <Heart className="h-[13px] w-[13px] text-red-500 fill-current" />;
      case 'reply':   return <MessageCircle className="h-[13px] w-[13px] text-blue-500" />;
      case 'follow':  return <UserPlus className="h-[13px] w-[13px] text-green-500" />;
      case 'repost':  return <Repeat2 className="h-[13px] w-[13px] text-purple-500" />;
      case 'mention': return <AtSign className="h-[13px] w-[13px] text-orange-500" />;
      case 'trending':return <TrendingUp className="h-[13px] w-[13px] text-yellow-500" />;
      default: return <Bell className="h-[13px] w-[13px] text-muted-foreground" />;
    }
  };

  const getText = (n: AppNotification) => {
    const actor = n.actor?.username ? `@${n.actor.username}` : 'Someone';
    switch (n.type) {
      case 'like':    return <><span className="font-semibold">{actor}</span> liked your thread</>;
      case 'reply':   return <><span className="font-semibold">{actor}</span> replied to your thread</>;
      case 'follow':  return <><span className="font-semibold">{actor}</span> started following you</>;
      case 'repost':  return <><span className="font-semibold">{actor}</span> reposted your thread</>;
      case 'mention': return <>{n.content || <><span className="font-semibold">{actor}</span> mentioned you</>}</>;
      case 'trending':return <>{n.content || 'Your thread is trending!'}</>;
      default: return 'New notification';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto pb-24">
        {/* Sticky header */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
          <div className="flex items-center px-4 h-12 gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-bold flex-1">Activity</h1>
            {notifications.length > 0 && (
              <span className="text-xs text-muted-foreground">{notifications.length} notifications</span>
            )}
          </div>
        </div>

        {/* Push notification prompt */}
        {isPushSupported() && pushPermission === 'default' && (
          <div className="mx-4 mt-4 p-3.5 rounded-2xl border border-border/60 bg-primary/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none mb-0.5">Enable push notifications</p>
              <p className="text-xs text-muted-foreground">Get instant alerts for likes, follows & replies</p>
            </div>
            <Button size="sm" onClick={handleEnablePush} disabled={requestingPush} className="rounded-full flex-shrink-0 text-xs h-8 px-3">
              {requestingPush ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enable'}
            </Button>
          </div>
        )}

        {pushPermission === 'granted' && !loading && (
          <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Bell className="h-3 w-3 text-green-500" />
            <span>Push notifications are enabled</span>
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
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="h-9 w-9 text-muted-foreground" />
            </div>
            <p className="font-bold text-lg mb-1">All caught up!</p>
            <p className="text-sm text-muted-foreground">Notifications will appear here when someone interacts with you.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 mt-2">
            {notifications.map(n => (
              <button
                key={n.id}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40 active:bg-accent/60"
                onClick={() => handleNotificationClick(n)}
              >
                {/* Actor avatar with icon badge */}
                <div className="flex-shrink-0 relative mt-0.5">
                  {n.actor ? (
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={n.actor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor.username}`} />
                        <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                          {n.actor.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-background flex items-center justify-center border border-border shadow-sm">
                        {getNotifIcon(n.type)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getNotifIcon(n.type)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] leading-snug">{getText(n)}</p>
                  {n.thread && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">"{n.thread.content}"</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
