/* Service Worker for XHedge Notifications */

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {
    title: 'XHedge Update',
    body: 'An on-chain event was detected on your account.',
    icon: '/shield.png'
  };

  const options = {
    body: data.body,
    icon: data.icon || '/shield.png',
    badge: '/badge.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
