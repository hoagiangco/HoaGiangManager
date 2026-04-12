'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOs8iawbH0xpwPaFUnjPE5FqE65j8MEUrNXc5cKP7yWZEVWdL2K-c5irBdmXLe-shiUnh962nEHjJZWiqebocCY';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

interface NotificationItem {
    id: number;
    title: string;
    content: string;
    type: 'report' | 'maintenance' | 'system';
    category: string;
    targetUrl: string;
    isRead: boolean;
    createdAt: string;
}

interface PushNotificationManagerProps {
    pendingCount?: number;
}

export function PushNotificationManager({ pendingCount = 0 }: PushNotificationManagerProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const prevUnreadCount = useRef(0);

    // Fetch persistent notifications
    const { data: notificationsData } = useSWR('/notifications?limit=10', fetcher, {
        refreshInterval: 15000, 
    });

    const notifications: NotificationItem[] = notificationsData?.data || [];
    const unreadCount = notifications.length;

    useEffect(() => {
        // Play sound if new notification arrives
        if (unreadCount > prevUnreadCount.current) {
            playNotificationSound();
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('[Push] Audio play blocked or failed:', e));
        } catch (e) {}
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasSW = 'serviceWorker' in navigator;
            const hasPush = 'PushManager' in window;
            const isSecure = window.isSecureContext;
            
            if (hasSW && hasPush && isSecure) {
                setIsSupported(true);
                
                ensureServiceWorkerRegistered()
                    .then(() => {
                        if (Notification.permission === 'granted') {
                            checkAndSubscribeSilently();
                        }
                    })
                    .catch(err => {
                        console.error('[Push] SW Registration failed:', err);
                    });
            }
        }

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const ensureServiceWorkerRegistered = async () => {
        try {
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[Push] SW registered manually:', registration.scope);
            }
            return registration;
        } catch (error) {
            console.error('[Push] Failed to register SW:', error);
            throw error;
        }
    };

    const checkAndSubscribeSilently = async () => {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && Notification.permission === 'granted') {
                const existingSubscription = await registration.pushManager.getSubscription();
                if (!existingSubscription) {
                    await subscribeToPush(registration, true);
                }
            }
        } catch (error) {
            console.error('[Push] Silent subscription error:', error);
        }
    };

    const subscribeToPush = async (registration: ServiceWorkerRegistration, silent = false) => {
        if (isSubscribing) return;
        setIsSubscribing(true);
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            await api.post('/notifications/subscribe', subscription);
            console.log('[Push] Successfully subscribed');
            if (!silent) toast.success('Đã kích hoạt thông báo thành công!');
        } catch (error) {
            console.error('[Push] Subscribe error:', error);
            if (!silent) toast.error('Lỗi khi đăng ký thông báo: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleBellClick = async () => {
        const nextState = !showDropdown;
        setShowDropdown(nextState);

        if (nextState && isSupported) {
            // Early permission request
            if (Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'denied') return;
                } catch (e) {
                    console.error('[Push] Permission error:', e);
                }
            }

            try {
                const registration = await ensureServiceWorkerRegistered();
                
                // Wait for SW to be active if it's new
                if (!registration.active) {
                    await new Promise((resolve) => {
                        const interval = setInterval(() => {
                            if (registration.active) {
                                clearInterval(interval);
                                resolve(true);
                            }
                        }, 500);
                        setTimeout(() => { clearInterval(interval); resolve(false); }, 5000);
                    });
                }

                const existingSubscription = await registration.pushManager.getSubscription();
                
                if (!existingSubscription) {
                    if (Notification.permission === 'granted') {
                        await subscribeToPush(registration);
                    }
                } else {
                    await api.post('/notifications/subscribe', existingSubscription);
                }
            } catch (err) {
                console.error('[Push] Bell error:', err);
                toast.error('Lỗi: Service Worker chưa sẵn sàng. Hãy thử reset trình duyệt.');
            }
        }
    };

    const handleNotificationClick = async (notification: NotificationItem) => {
        try {
            await api.post('/notifications', { notificationId: notification.id });
            mutate('/notifications?limit=10');
            setShowDropdown(false);
            if (notification.targetUrl) router.push(notification.targetUrl);
        } catch (error) {
            console.error('Notification error:', error);
            if (notification.targetUrl) router.push(notification.targetUrl);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications', { all: true });
            mutate('/notifications?limit=10');
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch (error) {
            toast.error('Lỗi khi cập nhật thông báo');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'report': return <i className="fas fa-exclamation-triangle text-warning"></i>;
            case 'maintenance': return <i className="fas fa-wrench text-info"></i>;
            case 'system': return <i className="fas fa-info-circle text-primary"></i>;
            default: return <i className="fas fa-bell text-secondary"></i>;
        }
    };

    const getTimeAgo = (dateStr: string) => {
        try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi }); } catch (e) { return 'Vừa xong'; }
    };

    if (!isSupported) return null;

    return (
        <div className="notification-container d-flex align-items-center" style={{ minWidth: '35px' }} ref={dropdownRef}>
            <div className="position-relative">
                <button 
                    className={`notification-trigger d-flex align-items-center justify-content-center ${showDropdown ? 'active' : ''}`}
                    onClick={handleBellClick}
                    style={{ 
                        background: 'none', border: 'none',
                        color: showDropdown ? '#007bff' : (unreadCount > 0 ? '#dc3545' : '#6c757d'), 
                        width: '32px', height: '32px', cursor: 'pointer', borderRadius: '50%'
                    }}
                    title="Thông báo"
                >
                    <i className="fas fa-bell fs-5"></i>
                </button>
                
                {unreadCount > 0 && (
                    <span 
                        className="position-absolute badge rounded-pill bg-danger border border-white text-white d-flex align-items-center justify-content-center" 
                        style={{ 
                            top: '-4px', right: '-4px', padding: '2px 5px', fontSize: '10px', zIndex: 10,
                            minWidth: '18px', height: '18px', fontWeight: 'bold'
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {showDropdown && (
                    <div className="notification-dropdown">
                        <div className="notification-header d-flex justify-content-between align-items-center p-3 text-dark border-bottom bg-light">
                            <h6 className="m-0 fw-bold">Thông báo ({unreadCount})</h6>
                            <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={markAllAsRead}>
                                Đọc tất cả
                            </button>
                        </div>
                        
                        <div className="notification-list custom-scrollbar" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <div key={notification.id} className="notification-item p-3 d-flex gap-3 text-dark border-bottom" onClick={() => handleNotificationClick(notification)}>
                                        <div className="notification-icon-wrapper pt-1">{getIcon(notification.type)}</div>
                                        <div className="notification-content">
                                            <div className="notification-title fw-bold mb-1 small">{notification.title}</div>
                                            <div className="notification-body text-muted mb-1 x-small">{notification.content}</div>
                                            <div className="notification-time x-small opacity-75">{getTimeAgo(notification.createdAt)}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-muted">Không có thông báo mới</div>
                            )}
                        </div>
                        
                        <div className="notification-footer p-2 text-center border-top bg-white">
                            <Link href="/dashboard/damage-reports" className="small text-decoration-none" onClick={() => setShowDropdown(false)}>
                                Xem tất cả
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .notification-dropdown {
                    position: absolute; top: 100%; right: 0; margin-top: 10px; width: 300px;
                    background: #ffffff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                    z-index: 2000; overflow: hidden; animation: dropdownFadeIn 0.2s ease-out;
                }
                .notification-item { cursor: pointer; transition: background 0.2s; }
                .notification-item:hover { background: #f8f9fa; }
                .x-small { font-size: 0.75rem; }
                @keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @media (max-width: 576px) { .notification-dropdown { position: fixed; top: 60px; left: 10px; right: 10px; width: auto; } }
            `}</style>
        </div>
    );
}
