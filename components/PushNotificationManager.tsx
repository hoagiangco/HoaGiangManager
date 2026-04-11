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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch persistent notifications
    const { data: notificationsData, error } = useSWR('/notifications?limit=5', fetcher, {
        refreshInterval: 10000, // Poll every 10s
    });

    const notifications: NotificationItem[] = notificationsData?.data || [];
    const unreadCount = notifications.length;

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
        }

        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: NotificationItem) => {
        try {
            // Mark as read in DB
            await api.post('/notifications', { notificationId: notification.id });
            
            // Remove from local UI immediately for better UX
            mutate('/notifications?limit=5', {
                ...notificationsData,
                data: notifications.filter(n => n.id !== notification.id)
            }, false);

            setShowDropdown(false);
            
            // Navigate to target
            if (notification.targetUrl) {
                router.push(notification.targetUrl);
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            // Still navigate even if marking as read fails
            if (notification.targetUrl) {
                router.push(notification.targetUrl);
            }
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications', { all: true });
            mutate('/notifications?limit=5');
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
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
        } catch (e) {
            return 'Vừa xong';
        }
    };

    if (!isSupported) return null;

    return (
        <div className="notification-container d-flex align-items-center" style={{ minWidth: '35px' }} ref={dropdownRef}>
            <div className="position-relative">
                {/* Notification Trigger Button */}
                <button 
                    className={`notification-trigger d-flex align-items-center justify-content-center ${showDropdown ? 'active' : ''}`}
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{ 
                        background: 'none',
                        border: 'none',
                        color: showDropdown ? '#007bff' : '#6c757d', 
                        width: '32px',
                        height: '32px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        borderRadius: '50%'
                    }}
                    title="Thông báo"
                >
                    <i className="fas fa-bell fs-5"></i>
                </button>
                
                {/* Badge (Combined Count) */}
                {unreadCount > 0 && (
                    <span 
                        className="position-absolute badge rounded-pill bg-danger border border-white text-white d-flex align-items-center justify-content-center" 
                        style={{ 
                            top: '-4px',
                            right: '-4px',
                            padding: '2px 5px', 
                            fontSize: '10px', 
                            zIndex: 10,
                            minWidth: '18px',
                            height: '18px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(220, 53, 69, 0.4)',
                            pointerEvents: 'none'
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {/* Dropdown Menu (Glassmorphism) */}
                {showDropdown && (
                    <div className="notification-dropdown">
                        <div className="notification-header d-flex justify-content-between align-items-center p-3">
                            <h6 className="m-0 fw-bold">Thông báo ({unreadCount})</h6>
                            <button className="btn btn-link btn-sm p-0 text-decoration-none" onClick={markAllAsRead}>
                                Đọc tất cả
                            </button>
                        </div>
                        
                        <div className="notification-list custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <div 
                                        key={notification.id} 
                                        className="notification-item p-3 d-flex gap-3"
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="notification-icon-wrapper d-flex align-items-start pt-1">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="notification-content">
                                            <div className="notification-title fw-bold mb-1">{notification.title}</div>
                                            <div className="notification-body text-muted mb-1">{notification.content}</div>
                                            <div className="notification-time small opacity-75">{getTimeAgo(notification.createdAt)}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-muted">
                                    <i className="fas fa-bell-slash d-block mb-2 opacity-50 fs-4"></i>
                                    Không có thông báo mới
                                </div>
                            )}
                        </div>
                        
                        <div className="notification-footer p-2 text-center border-top">
                            <Link href="/dashboard/damage-reports" className="btn btn-link btn-sm text-decoration-none" onClick={() => setShowDropdown(false)}>
                                Xem tất cả
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .notification-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 10px;
                    width: 320px;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    overflow: hidden;
                    animation: dropdownFadeIn 0.2s ease-out;
                }

                @keyframes dropdownFadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .notification-header {
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                }

                .notification-list {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .notification-item {
                    cursor: pointer;
                    transition: background 0.2s ease;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.03);
                }

                .notification-item:hover {
                    background: rgba(0, 0, 0, 0.03);
                }

                .notification-item:last-child {
                    border-bottom: none;
                }

                .notification-title {
                    font-size: 0.9rem;
                    line-height: 1.2;
                }

                .notification-body {
                    font-size: 0.8rem;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .notification-time {
                    font-size: 0.7rem;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }

                @media (max-width: 576px) {
                    .notification-dropdown {
                        position: fixed;
                        top: 60px;
                        left: 10px;
                        right: 10px;
                        width: auto;
                    }
                }
            `}</style>
        </div>
    );
}
