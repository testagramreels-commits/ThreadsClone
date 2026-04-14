/**
 * Push Notification utilities
 * Handles Web Push API subscription and notification display
 */

const VAPID_PUBLIC_KEY = ''; // Will use browser's built-in notification without VAPID for now

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export function showLocalNotification(title: string, body: string, options?: NotificationOptions) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/manifest.json',
    badge: '/favicon.ico',
    tag: 'threads-notification',
    renotify: true,
    ...options,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

export function notifyLike(username: string, threadContent: string) {
  showLocalNotification(
    `❤️ ${username} liked your thread`,
    threadContent.substring(0, 80) + (threadContent.length > 80 ? '…' : ''),
  );
}

export function notifyFollow(username: string) {
  showLocalNotification(
    `👤 ${username} started following you`,
    'Tap to view their profile',
  );
}

export function notifyReply(username: string, replyContent: string) {
  showLocalNotification(
    `💬 ${username} replied to your thread`,
    replyContent.substring(0, 80) + (replyContent.length > 80 ? '…' : ''),
  );
}

export function notifyMention(username: string, threadContent: string) {
  showLocalNotification(
    `@ ${username} mentioned you`,
    threadContent.substring(0, 80) + (threadContent.length > 80 ? '…' : ''),
  );
}

export function notifyRepost(username: string) {
  showLocalNotification(
    `🔁 ${username} reposted your thread`,
    'Your thread is spreading!',
  );
}
