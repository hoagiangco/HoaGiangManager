'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'login' | 'forgot-password' | 'forgot-success'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Load error from sessionStorage after mount to avoid hydration error
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedError = sessionStorage.getItem('loginError');
      if (savedError) {
        sessionStorage.removeItem('loginError');
        setError(savedError);
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'forgot-success' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (view === 'forgot-success' && countdown === 0) {
      setView('login');
    }
    return () => clearTimeout(timer);
  }, [view, countdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Don't clear error immediately - only clear on success

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      if (response.data.status) {
        // Only clear error on successful login
        setError(null);
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        toast.success('Đăng nhập thành công!');
        router.push('/dashboard');
      } else {
        const errorMessage = response.data.error || 'Đăng nhập thất bại';
        setError(errorMessage);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('loginError', errorMessage);
        }
        toast.error(errorMessage);
      }
    } catch (error: any) {
      let errorMessage = 'Đã xảy ra lỗi khi đăng nhập';
      
      if (error.response) {
        // Server trả về lỗi
        if (error.response.data) {
          errorMessage = error.response.data.error || error.response.data.message || `Lỗi: ${error.response.status} ${error.response.statusText}`;
        } else {
          errorMessage = `Lỗi kết nối: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request được gửi nhưng không nhận được response
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      } else {
        // Lỗi khác
        errorMessage = error.message || 'Đã xảy ra lỗi không xác định';
      }
      
      setError(errorMessage);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('loginError', errorMessage);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    
    try {
      const response = await api.post('/auth/forgot-password', {
        email: forgotEmail
      });
      
      if (response.data.status) {
        setView('forgot-success');
        setCountdown(5);
        setForgotEmail('');
      } else {
        setForgotError(response.data.error || 'Đã xảy ra lỗi.');
      }
    } catch (error: any) {
      let errorMessage = 'Đã xảy ra lỗi khi gửi yêu cầu.';
      if (error.response && error.response.data) {
        errorMessage = error.response.data.error || errorMessage;
      }
      setForgotError(errorMessage);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-background">
        <div className="login-background-overlay"></div>
      </div>
      <div className="container-fluid">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-12 col-sm-10 col-md-6 col-lg-4 col-xl-4">
            <div className="login-card">
              {/* Logo Section */}
              <div className="login-logo-container">
                <div className="login-logo">
                  <img src="/icons/logo.png" alt="HoaGiang Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h2 className="login-title">HoaGiang Manager</h2>
                <p className="login-subtitle">Hệ thống quản lý vật tư và thiết bị</p>
              </div>

              {/* Form Section */}
              <div className="login-form-container">
                {view === 'login' ? (
                  <>
                    <div className={`login-error-container ${error ? 'has-error' : ''}`}>
                      {error && (
                        <div className="alert alert-danger mb-3 login-error-alert" role="alert">
                          <strong><i className="fas fa-exclamation-circle me-2"></i>Lỗi đăng nhập:</strong>
                          <div className="mt-1">{error}</div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleSubmit} className="login-form">
                      <div className="form-group mb-3">
                        <label htmlFor="email" className="form-label">
                          <i className="fas fa-envelope me-2"></i>Email
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="Nhập email của bạn"
                        />
                      </div>
                      <div className="form-group mb-3 position-relative">
                        <label htmlFor="password" className="form-label d-flex justify-content-between">
                          <span><i className="fas fa-lock me-2"></i>Mật khẩu</span>
                          <a href="#" onClick={(e) => { e.preventDefault(); setView('forgot-password'); }} style={{ fontSize: '14px', textDecoration: 'none' }} className="text-primary">
                            Quên mật khẩu?
                          </a>
                        </label>
                        <input
                          type="password"
                          className="form-control form-control-lg"
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Nhập mật khẩu"
                        />
                      </div>
                      <div className="form-group mb-4">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="rememberMe">
                            Ghi nhớ đăng nhập
                          </label>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 login-submit-btn"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Đang đăng nhập...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-sign-in-alt me-2"></i>
                            Đăng nhập
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : view === 'forgot-password' ? (
                  <>
                    <h4 className="mb-4 text-center">Khôi phục mật khẩu</h4>
                    <p className="text-muted text-center mb-4">Vui lòng nhập địa chỉ email của bạn. Chúng tôi sẽ gửi một liên kết để thiết lập lại mật khẩu.</p>
                    
                    <div className={`login-error-container ${forgotError ? 'has-error' : ''}`}>
                      {forgotError && (
                        <div className="alert alert-danger mb-3 login-error-alert" role="alert">
                          <strong><i className="fas fa-exclamation-circle me-2"></i>Lỗi:</strong>
                          <div className="mt-1">{forgotError}</div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleForgotPassword} className="login-form">
                      <div className="form-group mb-4">
                        <label htmlFor="forgotEmail" className="form-label">
                          <i className="fas fa-envelope me-2"></i>Email
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          id="forgotEmail"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          placeholder="Nhập email của bạn"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 login-submit-btn mb-3"
                        disabled={forgotLoading}
                      >
                        {forgotLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Gửi yêu cầu
                          </>
                        )}
                      </button>
                      <div className="text-center">
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); setForgotError(null); }} className="text-muted" style={{ textDecoration: 'none' }}>
                          <i className="fas fa-arrow-left me-1"></i> Quay lại đăng nhập
                        </a>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <h4 className="mb-4 text-center">Yêu cầu thành công!</h4>
                    <div className="alert alert-success mt-3 text-center">
                      <div className="mb-3">
                        <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#198754' }}></i>
                      </div>
                      <h5 className="mb-3">Vui lòng kiểm tra email của bạn</h5>
                      <p>Chúng tôi đã gửi một đường dẫn khôi phục mật khẩu. Vui lòng truy cập email để tiến hành thiết lập lại mật khẩu.</p>
                      <hr />
                      <p className="mb-0">
                        Tự động quay lại trang đăng nhập sau <strong>{countdown}</strong> giây...
                      </p>
                    </div>
                    <button
                      onClick={() => setView('login')}
                      className="btn btn-outline-primary btn-lg w-100 mt-3"
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Quay lại ngay
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

