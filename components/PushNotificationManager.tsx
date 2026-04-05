'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import Link from 'next/link';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface PushNotificationManagerProps {
    pendingCount?: number;
}

export function PushNotificationManager({ pendingCount = 0 }: PushNotificationManagerProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        }
    }, []);

    async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
        if (!('serviceWorker' in navigator)) return null;
        let registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
            try {
                registration = await navigator.serviceWorker.register('/sw.js');
            } catch (err) {
                console.error('SW Registration Failed:', err);
                return null;
            }
        }

        if (registration.active) return registration;

        // Wait for installing/waiting SW to become active (Max 3 seconds to avoid infinite loop)
        const sw = registration.installing || registration.waiting;
        if (sw) {
            await new Promise<void>((resolve) => {
                const timeoutId = setTimeout(resolve, 3000);
                sw.addEventListener('statechange', () => {
                    if (sw.state === 'activated' || sw.state === 'redundant') {
                        clearTimeout(timeoutId);
                        resolve();
                    }
                });
            });
        }
        
        // Return only if an active worker is actually ready, otherwise it will crash when subscribing
        return registration.active ? registration : null;
    }

    async function checkSubscription() {
        try {
            const registration = await getSWRegistration();
            if (!registration) return;
            
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
            setPermission(Notification.permission);
        } catch (e) {
            console.error('Check subscription error:', e);
        }
    }

    async function subscribeToPush() {
        if (!VAPID_PUBLIC_KEY) {
            toast.error('Lỗi cấu hình Push (Thiếu VAPID Key)');
            return;
        }

        setIsLoading(true);
        try {
            const registration = await getSWRegistration();
            if (!registration) {
                toast.error('Hệ thống thông báo bị trình duyệt chặn hoặc chưa sẵn sàng.');
                return;
            }
            
            if (Notification.permission === 'denied') {
                toast.warning('Vui lòng mở cài đặt trình duyệt để cho phép nhận thông báo.');
                return;
            }

            if (Notification.permission !== 'granted') {
                const p = await Notification.requestPermission();
                setPermission(p);
                if (p !== 'granted') return;
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            await api.post('/notifications/subscribe', sub);
            setSubscription(sub);
            toast.success('Đã bật thông báo đẩy thành công! 🔔');
        } catch (error: any) {
            console.error('Push subscription error:', error);
            if (error.message && error.message.includes('User denied')) return;
            toast.error('Không thể bật thông báo đẩy.');
        } finally {
            setIsLoading(false);
        }
    }

    async function unsubscribeFromPush() {
        setIsLoading(true);
        try {
            const registration = await getSWRegistration();
            if (!registration) return;
            
            const sub = await registration.pushManager.getSubscription();
            
            if (sub) {
                await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint });
                await sub.unsubscribe();
                setSubscription(null);
                setPermission('default');
                toast.info('Đã tắt thông báo đẩy.');
            }
        } catch (error: any) {
            console.error('Push unsubscription error:', error);
            toast.error('Lỗi khi tắt thông báo.');
        } finally {
            setIsLoading(false);
        }
    }

    if (!isSupported) return null;

    const isSubscribed = !!subscription;

    return (
        <div className="d-flex align-items-center" style={{ minWidth: '35px' }}>
            <div className="position-relative">
                {/* Bell Icon (Push Toggle) */}
                <button 
                    onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
                    disabled={isLoading}
                    className="btn btn-link p-0 border-0 shadow-none d-flex align-items-center justify-content-center"
                    style={{ 
                        color: 'inherit', 
                        textDecoration: 'none',
                        width: '32px',
                        height: '32px',
                        transition: 'all 0.2s ease'
                    }}
                    title={isSubscribed ? 'Đang bật - Nhấn để Tắt thông báo đẩy' : 'Đang tắt - Nhấn để Bật thông báo đẩy'}
                >
                    {isLoading ? (
                        <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ width: '1.2rem', height: '1.2rem' }}></div>
                    ) : (
                        <i className={`fas ${isSubscribed ? 'fa-bell text-warning' : 'fa-bell-slash text-muted opacity-50'} fs-5`}></i>
                    )}
                </button>
                
                {/* Badge for Pending Reports (Click to view) */}
                {pendingCount > 0 && (
                    <Link 
                        href="/dashboard/damage-reports?status=1"
                        className="position-absolute badge rounded-pill bg-danger border border-white text-white d-flex align-items-center justify-content-center" 
                        style={{ 
                            top: '-5px',
                            right: '-8px',
                            padding: '3px 6px', 
                            fontSize: '11px', 
                            textDecoration: 'none',
                            zIndex: 10,
                            minWidth: '18px',
                            height: '18px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(220, 53, 69, 0.4)'
                        }}
                        title={`${pendingCount} báo cáo chờ - Nhấn để xem`}
                    >
                        {pendingCount > 99 ? '99+' : pendingCount}
                    </Link>
                )}
            </div>
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
