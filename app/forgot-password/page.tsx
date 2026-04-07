'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await axios.post('/api/auth/forgot-password', {
        email
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status) {
        setSuccess(true);
        toast.success(response.data.message || 'Email khôi phục mật khẩu đã được gửi!');
      } else {
        toast.error(response.data.error || 'Yêu cầu không thành công.');
      }
    } catch (error: any) {
      let errorMessage = 'Đã xảy ra lỗi hệ thống';
      if (error.response?.data) {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
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
            <div className="login-card p-4">
              <div className="text-center mb-4">
                <div className="mb-3">
                  <i className="fas fa-lock" style={{ fontSize: '48px', color: '#0d6efd' }}></i>
                </div>
                <h2 className="login-title mb-2">Khôi Phục Mật Khẩu</h2>
                <p className="text-muted">Nhập email của SuperAdmin để nhận mã xác nhận.</p>
              </div>

              {success ? (
                <div className="alert alert-success text-center">
                  <i className="fas fa-check-circle me-2" style={{ fontSize: '24px', verticalAlign: 'middle' }}></i>
                  Vui lòng kiểm tra hộp thư email của bạn và làm theo hướng dẫn để thiết lập mật khẩu mới.
                  <div className="mt-4">
                     <button className="btn btn-outline-primary" onClick={() => router.push('/login')}>Quay Lại Đăng Nhập</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="login-form">
                  <div className="form-group mb-4">
                    <label htmlFor="email" className="form-label text-start d-block">
                      <i className="fas fa-envelope me-2"></i>Email
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-lg"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Nhập email hoagiangkg@gmail.com"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 login-submit-btn mb-3"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Gửi Yêu Cầu
                      </>
                    )}
                  </button>
                  <div className="text-center">
                    <button type="button" className="btn btn-link text-decoration-none" onClick={() => router.push('/login')}>
                      <i className="fas fa-arrow-left me-2"></i>Quay lại trang đăng nhập
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
