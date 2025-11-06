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
                  <i className="fas fa-cube"></i>
                </div>
                <h2 className="login-title">HoaGiang Manager</h2>
                <p className="login-subtitle">Hệ thống quản lý vật tư và thiết bị</p>
              </div>

              {/* Form Section */}
              <div className="login-form-container">
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
                  <div className="form-group mb-3">
                    <label htmlFor="password" className="form-label">
                      <i className="fas fa-lock me-2"></i>Mật khẩu
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
                
                {/* Default Accounts Info */}
                <div className="login-accounts-info">
                  <div className="alert alert-info mb-0">
                    <strong><i className="fas fa-info-circle me-2"></i>Tài khoản mặc định:</strong>
                    <div className="mt-2">
                      <small>
                        <strong>Admin:</strong> admin@quanlyvt.com / Admin@123
                        <br />
                        <strong>User:</strong> user@quanlyvt.com / User@123
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

