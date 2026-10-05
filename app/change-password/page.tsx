'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import api from '@/lib/utils/api';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (!response.data.status) {
        throw new Error(response.data.error || 'Không thể đổi mật khẩu');
      }

      if (user) {
        updateUser({ ...user, mustChangePassword: false });
      }
      toast.success('Đổi mật khẩu thành công');
      router.replace('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 py-4">
      <div className="card shadow-sm w-100" style={{ maxWidth: 480 }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-2">Đổi mật khẩu</h1>
          <p className="text-muted mb-4">
            Tài khoản mới phải đổi mật khẩu tạm trước khi sử dụng hệ thống.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="currentPassword">Mật khẩu hiện tại</label>
              <input
                id="currentPassword"
                className="form-control"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="newPassword">Mật khẩu mới</label>
              <input
                id="newPassword"
                className="form-control"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <div className="form-text">Ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</div>
            </div>

            <div className="mb-4">
              <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                id="confirmPassword"
                className="form-control"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <button className="btn btn-primary w-100" type="submit" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
