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
            renotify: true, // Always re-notify even if tag is same
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'Xem chi tiết' },
                { action: 'close', title: 'Đóng' }
            ]
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

    // Nếu người dùng bấm nút "Đóng" hoặc các hành động đóng khác thì không làm gì thêm
    const action = event.action;
    if (action === 'close' || action === 'dismiss') {
        return;
    }

    // Nếu không phải là click vào thân thông báo (action rỗng) và cũng không phải nút "open" 
    // thì cũng không mở app (phòng trường hợp trình duyệt gửi action lạ)
    if (action !== '' && action !== 'open') {
        return;
    }

    // Nếu bấm "Xem chi tiết" hoặc click thẳng vào thông báo thì mở app
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

