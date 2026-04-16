const VAPID_PUBLIC_KEY = ''; // reserved for future Web Push / Firebase Web

/* =========================
   SUPPORT CHECKS
========================= */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/* =========================
   PERMISSIONS
========================= */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

/* =========================
   CORE NOTIFICATION ENGINE
========================= */
function createNotification(title: string, body: string, options?: NotificationOptions) {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico', // FIXED: manifest.json is NOT valid icon
    badge: '/favicon.ico',
    tag: 'app-notification',
    renotify: true,
    ...options,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  setTimeout(() => notification.close(), 5000);
}

/* =========================
   NOTIFICATION TYPES
========================= */
export function notifyLike(username: string, content: string) {
  createNotification(
    `❤️ ${username} liked your thread`,
    truncate(content)
  );
}

export function notifyFollow(username: string) {
  createNotification(
    `👤 ${username} started following you`,
    'Tap to view profile'
  );
}

export function notifyReply(username: string, content: string) {
  createNotification(
    `💬 ${username} replied to your thread`,
    truncate(content)
  );
}

export function notifyMention(username: string, content: string) {
  createNotification(
    `@ ${username} mentioned you`,
    truncate(content)
  );
}

export function notifyRepost(username: string) {
  createNotification(
    `🔁 ${username} reposted your thread`,
    'Your content is spreading!'
  );
}

/* =========================
   UTILITY
========================= */
function truncate(text: string, max = 80) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}
