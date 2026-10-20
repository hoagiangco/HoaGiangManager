'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { safeLocalStorage } from '@/lib/utils/localStorage';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

type PlatformType = 'android-inapp' | 'ios-inapp' | 'ios-safari' | 'standard';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // Default true until client check completes
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<PlatformType>('standard');

  const checkIsStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const isStandaloneDisplay =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      window.matchMedia?.('(display-mode: minimal-ui)').matches;
    const isIosStandalone = Boolean((window.navigator as any).standalone);
    const isAndroidTwa = document.referrer.includes('android-app://');
    return Boolean(isStandaloneDisplay || isIosStandalone || isAndroidTwa);
  }, []);

  const detectPlatform = useCallback((): PlatformType => {
    if (typeof window === 'undefined') return 'standard';
    const ua = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isInApp = /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line|TikTok|MicroMessenger/i.test(ua);

    if (isIos && isInApp) return 'ios-inapp';
    if (!isIos && isInApp) return 'android-inapp';
    if (isIos) return 'ios-safari';
    return 'standard';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Ensure Service Worker is registered on all pages (including /login)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
      });
    }

    // 2. Check if already running inside installed app (standalone mode)
    if (checkIsStandalone()) {
      setIsInstalled(true);
      safeLocalStorage.setItem('pwa_installed', 'true');
      return;
    }

    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    const dismissedInSession = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
    const previouslyInstalled = safeLocalStorage.getItem('pwa_installed') === 'true';

    // 3. Check if early head script already captured beforeinstallprompt
    if (window.__deferredPwaPrompt) {
      // If browser fired beforeinstallprompt, the app is definitely NOT installed right now
      safeLocalStorage.removeItem('pwa_installed');
      setDeferredPrompt(window.__deferredPwaPrompt);
      setIsInstalled(false);
      if (!dismissedInSession) {
        setShowModal(true);
      }
    } else if (!previouslyInstalled) {
      setIsInstalled(false);
    }

    // 4. Check navigator.getInstalledRelatedApps if supported
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            setIsInstalled(true);
            setShowModal(false);
            safeLocalStorage.setItem('pwa_installed', 'true');
          }
        })
        .catch(() => {});
    }

    // 5. Listen for beforeinstallprompt (both direct and via custom event from head script)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      safeLocalStorage.removeItem('pwa_installed');
      setDeferredPrompt(promptEvent);
      setIsInstalled(false);
      if (sessionStorage.getItem('pwa_prompt_dismissed') !== 'true') {
        setShowModal(true);
      }
    };

    const handlePwaAvailable = () => {
      if (window.__deferredPwaPrompt) {
        safeLocalStorage.removeItem('pwa_installed');
        setDeferredPrompt(window.__deferredPwaPrompt);
        setIsInstalled(false);
        if (sessionStorage.getItem('pwa_prompt_dismissed') !== 'true') {
          setShowModal(true);
        }
      }
    };

    const handleAppInstalled = () => {
      window.__deferredPwaPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowModal(false);
      setShowGuide(false);
      safeLocalStorage.setItem('pwa_installed', 'true');
      toast.success('Đã cài đặt ứng dụng HoaGiang Manager thành công!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-install-available', handlePwaAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Fallback timer: if user opens link on mobile/tablet/desktop and app is not installed,
    // show the encouragement modal even if beforeinstallprompt hasn't fired yet (e.g., iOS Safari or Zalo WebView)
    const timer = setTimeout(() => {
      if (
        !checkIsStandalone() &&
        safeLocalStorage.getItem('pwa_installed') !== 'true' &&
        sessionStorage.getItem('pwa_prompt_dismissed') !== 'true'
      ) {
        setIsInstalled(false);
        setShowModal(true);
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-available', handlePwaAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIsStandalone, detectPlatform]);

  const handleCancel = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowModal(false);
    setShowGuide(false);
  };

  const handleAccept = async () => {
    const activePrompt = deferredPrompt || window.__deferredPwaPrompt;

    // Case 1: Browser supports native automatic installation via beforeinstallprompt
    if (activePrompt) {
      setIsInstalling(true);
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          window.__deferredPwaPrompt = null;
          setDeferredPrompt(null);
          setIsInstalled(true);
          setShowModal(false);
          safeLocalStorage.setItem('pwa_installed', 'true');
          toast.info('Đang tự động cài đặt ứng dụng lên thiết bị...');
        } else {
          sessionStorage.setItem('pwa_prompt_dismissed', 'true');
          setShowModal(false);
        }
      } catch (err) {
        console.error('[PWA] Error triggering install prompt:', err);
        setShowGuide(true);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    // Case 2: User opened link in Zalo/Messenger/Facebook on Android -> try jumping to Chrome automatically
    if (platform === 'android-inapp') {
      const currentUrl = window.location.href;
      const cleanUrl = currentUrl.replace(/^https?:\/\//i, '');
      const scheme = window.location.protocol.replace(':', '');
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=${scheme};package=com.android.chrome;end`;
      window.location.href = intentUrl;
      setShowGuide(true);
      return;
    }

    // Case 3: iOS Safari or browser without beforeinstallprompt -> show visual guide
    setShowGuide(true);
  };

  if (isInstalled && !showModal) {
    return null;
  }

  return (
    <>
      {showModal && (
        <div className="pwa-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pwa-modal-title">
          <div className="pwa-modal-card">
            <div className="pwa-modal-header">
              <div className="pwa-app-icon-wrapper">
                <img src="/icons/icon-192x192.png" alt="HoaGiang Manager" className="pwa-app-icon" />
              </div>
              <div className="pwa-header-text">
                <h5 id="pwa-modal-title" className="pwa-title mb-1">
                  Cài đặt ứng dụng HoaGiang Manager
                </h5>
                <span className="badge bg-primary-subtle text-primary rounded-pill" style={{ fontSize: '0.75rem' }}>
                  <i className="fas fa-shield-alt me-1"></i>Ứng dụng chính thức
                </span>
              </div>
            </div>

            {!showGuide ? (
              <>
                <div className="pwa-modal-body">
                  <p className="mb-2 text-dark" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                    Thiết bị của bạn chưa cài đặt ứng dụng <strong>HoaGiang Manager</strong>. Bạn có muốn cài đặt ứng dụng lên thiết bị để sử dụng nhanh chóng và thuận tiện hơn không?
                  </p>
                  <ul className="pwa-benefit-list mb-0">
                    <li>
                      <i className="fas fa-bolt text-primary me-2"></i>Mở nhanh trực tiếp từ màn hình chính như ứng dụng di động
                    </li>
                    <li>
                      <i className="fas fa-bell text-primary me-2"></i>Nhận thông báo công việc và sự cố thiết bị tức thì
                    </li>
                    <li>
                      <i className="fas fa-feather-alt text-primary me-2"></i>Dung lượng siêu nhẹ, tự động cập nhật phiên bản mới
                    </li>
                  </ul>
                </div>

                <div className="pwa-modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary pwa-btn"
                    onClick={handleCancel}
                    disabled={isInstalling}
                  >
                    <i className="fas fa-times me-1"></i>Huỷ
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary pwa-btn pwa-btn-accept"
                    onClick={handleAccept}
                    disabled={isInstalling}
                  >
                    {isInstalling ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Đang cài đặt...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download me-2"></i>Đồng ý cài đặt
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="pwa-modal-body">
                  {platform === 'android-inapp' || platform === 'ios-inapp' ? (
                    <div className="pwa-guide-box">
                      <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: '0.88rem' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        Bạn đang mở liên kết trong ứng dụng nhắn tin (Zalo/Messenger). Để tự động cài đặt lên thiết bị, vui lòng thực hiện:
                      </div>
                      <ol className="pwa-steps mb-0">
                        <li>
                          Nhấn vào biểu tượng <strong><i className="fas fa-ellipsis-h mx-1"></i> (3 chấm)</strong> ở góc trên bên phải màn hình.
                        </li>
                        <li>
                          Chọn <strong>&ldquo;Mở bằng trình duyệt&rdquo;</strong> ({platform === 'ios-inapp' ? 'Safari' : 'Chrome'}).
                        </li>
                        <li>
                          Nhấn <strong>Đồng ý cài đặt</strong> khi trang mở ra trong trình duyệt.
                        </li>
                      </ol>
                    </div>
                  ) : platform === 'ios-safari' ? (
                    <div className="pwa-guide-box">
                      <p className="mb-2 fw-semibold text-primary" style={{ fontSize: '0.9rem' }}>
                        <i className="fab fa-apple me-1"></i> Hướng dẫn cài đặt nhanh trên iPhone / iPad:
                      </p>
                      <ol className="pwa-steps mb-0">
                        <li>
                          Nhấn vào nút <strong>Chia sẻ (Share)</strong>{' '}
                          <span className="badge bg-light text-dark border mx-1">
                            <i className="fas fa-share-square text-primary"></i>
                          </span>{' '}
                          ở thanh công cụ của trình duyệt Safari.
                        </li>
                        <li>
                          Cuộn xuống và chọn <strong>&ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen)</strong>{' '}
                          <span className="badge bg-light text-dark border mx-1">
                            <i className="fas fa-plus-square text-primary"></i>
                          </span>.
                        </li>
                        <li>
                          Nhấn <strong>&ldquo;Thêm&rdquo; (Add)</strong> ở góc trên bên phải để hoàn tất.
                        </li>
                      </ol>
                    </div>
                  ) : (
                    <div className="pwa-guide-box">
                      <p className="mb-2 fw-semibold text-primary" style={{ fontSize: '0.9rem' }}>
                        <i className="fas fa-mobile-alt me-1"></i> Hướng dẫn hoàn tất cài đặt trên trình duyệt:
                      </p>
                      <ol className="pwa-steps mb-0">
                        <li>
                          Nhấn vào biểu tượng menu <strong><i className="fas fa-ellipsis-v mx-1"></i> (3 chấm)</strong> ở góc trên bên phải trình duyệt (hoặc biểu tượng cài đặt trên thanh địa chỉ).
                        </li>
                        <li>
                          Chọn <strong>&ldquo;Cài đặt ứng dụng&rdquo; (Install app)</strong> hoặc <strong>&ldquo;Thêm vào màn hình chính&rdquo;</strong>.
                        </li>
                        <li>
                          Nhấn <strong>Cài đặt</strong> để xác nhận.
                        </li>
                      </ol>
                    </div>
                  )}
                </div>

                <div className="pwa-modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary w-100 pwa-btn"
                    onClick={handleCancel}
                  >
                    Đã hiểu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .pwa-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: pwaFadeIn 0.25s ease-out;
        }
        .pwa-modal-card {
          background: #ffffff;
          width: 100%;
          max-width: 440px;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: pwaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pwa-modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px 20px 14px 20px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #f8faff 0%, #eef4ff 100%);
        }
        .pwa-app-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.25);
          background: #0d6efd;
        }
        .pwa-app-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pwa-title {
          font-size: 1.08rem;
          font-weight: 700;
          color: #1e293b;
        }
        .pwa-modal-body {
          padding: 18px 20px;
        }
        .pwa-benefit-list {
          list-style: none;
          padding: 12px 14px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 0.86rem;
          color: #475569;
        }
        .pwa-benefit-list li {
          margin-bottom: 6px;
          display: flex;
          align-items: flex-start;
        }
        .pwa-benefit-list li:last-child {
          margin-bottom: 0;
        }
        .pwa-benefit-list li i {
          margin-top: 3px;
          width: 18px;
          text-align: center;
          flex-shrink: 0;
        }
        .pwa-guide-box {
          font-size: 0.9rem;
          color: #334155;
        }
        .pwa-steps {
          padding-left: 20px;
          line-height: 1.6;
        }
        .pwa-steps li {
          margin-bottom: 8px;
        }
        .pwa-steps li:last-child {
          margin-bottom: 0;
        }
        .pwa-modal-footer {
          display: flex;
          gap: 10px;
          padding: 14px 20px 20px 20px;
          justify-content: flex-end;
        }
        .pwa-btn {
          flex: 1;
          padding: 10px 16px;
          font-weight: 600;
          border-radius: 10px;
          font-size: 0.95rem;
        }
        .pwa-btn-accept {
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
        }
        @keyframes pwaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
