'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    async function checkSubscription() {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscription(sub);
        setPermission(Notification.permission);
    }

    async function subscribeToPush() {
        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID public key is not set');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Ask for permission if not granted
            if (Notification.permission !== 'granted') {
                const p = await Notification.requestPermission();
                setPermission(p);
                if (p !== 'granted') {
                    toast.error('Vui lòng cấp quyền thông báo để nhận tin tức mới nhất');
                    return;
                }
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send subscription to server
            const response = await api.post('/api/notifications/subscribe', sub);
            if (response.data.status) {
                setSubscription(sub);
                toast.success('Đăng ký nhận thông báo thành công');
            } else {
                throw new Error(response.data.error || 'Lỗi khi lưu đăng ký');
            }
        } catch (error) {
            console.error('Push subscription error:', error);
            toast.error('Không thể đăng ký nhận thông báo. Vui lòng thử lại sau.');
        }
    }

    if (!isSupported) return null;

    // We can return a button or just handle it silently, but for now we won't return UI 
    // and instead expose a trigger if needed, or just auto-subscribe if permission is granted.
    return (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
            {permission !== 'granted' && (
                <button 
                    onClick={subscribeToPush}
                    className="btn btn-warning shadow-lg btn-sm rounded-pill px-3"
                    title="Đăng ký nhận thông báo"
                >
                    <i className="fas fa-bell me-1"></i> Bật thông báo
                </button>
            )}
        </div>
    );
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
