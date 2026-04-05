self.addEventListener('push', function(event) {
    if (!event.data) return;
    try {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/icons/icon.svg',
            badge: data.badge || '/icons/icon-maskable.svg',
            vibrate: data.vibrate || [100, 50, 100],
            data: data.data || { url: '/dashboard' },
            tag: data.tag || 'hoagiang-report',
            renotify: data.renotify !== false,
            requireInteraction: data.requireInteraction || false,
            actions: data.actions || []
        };
        event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
        console.error('Error in push event:', e);
        // Fallback for non-JSON push (optional)
        event.waitUntil(self.registration.showNotification('Thông báo mới', {
            body: event.data.text(),
            icon: '/icons/icon.svg',
        }));
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
