// Snacka Service Worker for Background Calling, Web Push, and Lock Screen Alerts
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle real-time Web Push from server when screen is locked/asleep
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    try {
      payload = { title: event.data.text() };
    } catch (e) {
      payload = {};
    }
  }

  if (payload.type === 'INCOMING_CALL') {
    const caller = payload.callerName || 'En kontakt';
    const title = `📞 ${caller} ringer dig!`;
    const callerEmail = payload.callerEmail || '';

    const options = {
      body: 'Tryck här eller på SVARA för att prata 📞',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'incoming-call',
      renotify: true,
      requireInteraction: true,
      vibrate: [600, 300, 600, 300, 800, 400, 800, 400],
      data: {
        type: 'INCOMING_CALL',
        callerEmail: callerEmail,
        callerName: caller,
        url: `/?incoming_caller=${encodeURIComponent(callerEmail)}&autoAnswer=true`,
      },
      actions: [
        { action: 'answer', title: '📞 Svara' },
        { action: 'reject', title: '🔴 Avvisa' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } else if (payload.type === 'CANCEL_CALL') {
    // Other party hung up
    event.waitUntil(
      self.registration.getNotifications({ tag: 'incoming-call' }).then((notifications) => {
        notifications.forEach((n) => n.close());
      })
    );
  } else if (payload.type === 'TEST') {
    const title = payload.title || '🔔 Snacka: Notiser fungerar!';
    const options = {
      body: payload.body || 'Standby-notiser är nu aktiverade och redo att ringa.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-notification',
      vibrate: [400, 200, 400],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Listen for messages from client app to show/close notifications
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_CALL_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      ...options,
      requireInteraction: true,
      vibrate: [600, 300, 600, 300, 800, 400],
      actions: [
        { action: 'answer', title: '📞 Svara' },
        { action: 'reject', title: '🔴 Avvisa' },
      ],
    });
  } else if (event.data.type === 'CLOSE_CALL_NOTIFICATION') {
    self.registration.getNotifications({ tag: 'incoming-call' }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});

// Handle notification click on Lock Screen or Notification Tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || `/?incoming_caller=${encodeURIComponent(data.callerEmail || '')}&autoAnswer=${action === 'answer' ? 'true' : 'false'}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window client is already open, focus it and dispatch action
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CALL_ACTION',
            action: action || 'answer',
            callerEmail: data.callerEmail,
            callerName: data.callerName,
            contactId: data.contactId,
          });
          return client.focus();
        }
      }
      // If no window is open (e.g. app was closed in background), launch new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
