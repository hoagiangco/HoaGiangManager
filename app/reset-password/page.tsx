'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token || !email) {
      router.push('/login');
    }
  }, [token, email, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (success && countdown === 0) {
      router.push('/login');
    }
    return () => clearTimeout(timer);
  }, [success, countdown, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        email,
        newPassword
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Thiết lập thất bại.');
      }
    } catch (err: any) {
      let errorMessage = 'Đã xảy ra lỗi hệ thống';
      if (err.response?.data) {
        errorMessage = err.response.data.error || err.response.data.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return <div>Đang kiểm tra liên kết...</div>;
  }

  return (
    <div className="login-page-container">
      <div className="login-background">
        <div className="login-background-overlay"></div>
      </div>
      <div className="container-fluid">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-12 col-sm-10 col-md-6 col-lg-4 col-xl-4">
            <div className="login-card p-4">
              <div className="text-center mb-4">
                <div className="mb-3">
                  <i className="fas fa-key" style={{ fontSize: '48px', color: '#0d6efd' }}></i>
                </div>
                <h2 className="login-title mb-2">Tạo Mật Khẩu Mới</h2>
                <p className="text-muted">Nhập mật khẩu mới cho tài khoản SuperAdmin của bạn.</p>
              </div>

              {success ? (
                <div className="alert alert-success mt-3 text-center">
                  <div className="mb-3 mt-2">
                    <i className="fas fa-check-circle" style={{ fontSize: '48px', color: '#198754' }}></i>
                  </div>
                  <h4 className="mb-3">Thành công!</h4>
                  <p>Mật khẩu của bạn đã được thiết lập lại thành công. Bạn có thể sử dụng mật khẩu mới để đăng nhập.</p>
                  <hr />
                  <p className="mb-0">
                    Tự động quay lại trang đăng nhập sau <strong>{countdown}</strong> giây...
                  </p>
                  <button
                    onClick={() => router.push('/login')}
                    className="btn btn-outline-primary btn-lg w-100 mt-4"
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Đăng nhập ngay
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="login-form">
                   <div className={`login-error-container ${error ? 'has-error' : ''}`}>
                     {error && (
                       <div className="alert alert-danger mb-3 login-error-alert" role="alert">
                         <strong><i className="fas fa-exclamation-circle me-2"></i>Lỗi:</strong>
                         <div className="mt-1">{error}</div>
                       </div>
                     )}
                   </div>
                   <div className="form-group mb-3">
                    <label htmlFor="emailDisplay" className="form-label text-start d-block">
                      <i className="fas fa-envelope me-2"></i>Email
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-lg bg-light"
                      id="emailDisplay"
                      value={email as string}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label htmlFor="newPassword" className="form-label text-start d-block">
                      <i className="fas fa-lock me-2"></i>Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Mật khẩu ít nhất 6 ký tự"
                      minLength={6}
                    />
                  </div>
                  <div className="form-group mb-4">
                    <label htmlFor="confirmPassword" className="form-label text-start d-block">
                      <i className="fas fa-check-circle me-2"></i>Xác nhận mật khẩu
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Nhập lại mật khẩu mới"
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 login-submit-btn mb-3"
                    disabled={loading || !newPassword || !confirmPassword}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Lưu Mật Khẩu
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
   return (
      <Suspense fallback={<div className="min-vh-100 d-flex justify-content-center align-items-center">Đang tải...</div>}>
         <ResetPasswordForm />
      </Suspense>
   );
}
