"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import AdminRoute from '@/components/AdminRoute';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { formatDateTime } from '@/lib/utils/dateFormat';
import { useAuth } from '@/lib/contexts/AuthContext';

interface BackupItem {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

function BackupPageContent() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes('SuperAdmin');

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/backup');
      if (res.data.status) {
        setBackups(res.data.data || []);
      }
    } catch (e: any) {
      toast.error('Lỗi khi tải danh sách bản sao lưu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (creating) return;
    try {
      setCreating(true);
      toast.info('Đang tạo bản sao lưu, vui lòng đợi...');
      const res = await api.post('/admin/backup');
      if (res.data.status) {
        toast.success('Đã tạo bản sao lưu thành công');
        loadBackups();
      }
    } catch (e: any) {
      toast.error('Lỗi khi tạo bản sao lưu: ' + (e.response?.data?.error || e.message));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (backup: BackupItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bản sao lưu ${backup.name}?`)) return;
    try {
      await api.delete(`/admin/backup?name=${backup.name}&url=${encodeURIComponent(backup.url)}`);
      toast.success('Đã xóa bản sao lưu');
      loadBackups();
    } catch (e: any) {
      toast.error('Lỗi khi xóa bản sao lưu');
    }
  };

  const [showRestoreGuideModal, setShowRestoreGuideModal] = useState(false);
  const [restoreGuideName, setRestoreGuideName] = useState('');

  const handleRestoreBackup = (backup: BackupItem) => {
    setRestoreGuideName(backup.name);
    setShowRestoreGuideModal(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container-fluid">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center bg-white py-3">
          <h5 className="mb-0 fw-bold">
            <i className="fas fa-database text-primary me-2"></i>
            Sao lưu & Khôi phục hệ thống
          </h5>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-secondary btn-sm" 
              onClick={loadBackups} 
              disabled={loading}
              title="Tải lại"
            >
              <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
            </button>
            <button 
              className="btn btn-success btn-sm" 
              onClick={handleCreateBackup}
              disabled={creating}
            >
              <i className={`fas ${creating ? 'fa-spinner fa-spin' : 'fa-plus'} me-2`}></i>
              {creating ? 'Đang sao lưu...' : 'Tạo bản sao lưu'}
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Tên tệp bản sao</th>
                  <th>Dung lượng</th>
                  <th>Ngày tạo</th>
                  <th className="text-center" style={{ width: '180px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      Đang tải danh sách bản sao lưu...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5 text-muted">
                      Chưa có bản sao lưu nào trong hệ thống.
                    </td>
                  </tr>
                ) : backups.map((b) => (
                  <tr key={b.name}>
                    <td className="align-middle">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-file-invoice text-primary me-3 fs-5"></i>
                        <div>
                          <div className="fw-medium">{b.name}</div>
                          <div className="small text-muted d-md-none">{formatSize(b.size)} • {formatDateTime(b.uploadedAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="align-middle d-none d-md-table-cell">{formatSize(b.size)}</td>
                    <td className="align-middle d-none d-md-table-cell small">{formatDateTime(b.uploadedAt)}</td>
                    <td className="align-middle">
                      <div className="d-flex gap-1 justify-content-center">
                        <a 
                          href={b.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-sm btn-outline-primary"
                          title={`Tải về file ${b.name.endsWith('.dump') ? 'Dump' : 'SQL'}`}
                          download={b.name}
                        >
                          <i className="fas fa-download"></i>
                        </a>
                        <button 
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleRestoreBackup(b)}
                          title="Hướng dẫn khôi phục dữ liệu"
                        >
                          <i className="fas fa-book-open"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteBackup(b)}
                          disabled={creating || !isSuperAdmin}
                          title={!isSuperAdmin ? 'Chỉ SuperAdmin mới có quyền xóa' : 'Xóa vĩnh viễn'}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-warning-subtle py-3 border-warning">
          <div className="d-flex align-items-start gap-2 small">
            <i className="fas fa-triangle-exclamation mt-1 text-warning"></i>
            <div>
              <p className="mb-1 fw-bold text-warning-emphasis">Lưu ý quan trọng về tính năng Khôi phục:</p>
              <ul className="mb-0 ps-3 text-muted">
                <li>Bản sao lưu có thể ở dạng <strong>.dump</strong> (định dạng Custom) hoặc <strong>.sql</strong> (định dạng Văn bản).</li>
                <li>Định dạng <strong>.dump</strong> khuyên dùng để khôi phục qua <strong>pgAdmin4</strong> hoặc lệnh <code>pg_restore</code>.</li>
                <li>Nút <i className="fas fa-book-open"></i> sẽ hiển thị hướng dẫn khôi phục thủ công chi tiết.</li>
                <li>Khuyến nghị: Luôn tạo bản sao lưu mới trước khi thực hiện bất kỳ thay đổi lớn nào.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Guide Modal */}
      {showRestoreGuideModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning-subtle">
                <h5 className="modal-title">
                  <i className="fas fa-triangle-exclamation text-warning me-2"></i>
                  Hướng dẫn khôi phục: <code style={{ fontSize: '0.8em' }}>{restoreGuideName}</code>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRestoreGuideModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <strong><i className="fas fa-skull-crossbones me-2"></i>CẢNH BÁO NGHIÊM TRỌNG:</strong> Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại. Bạn cần thực hiện khôi phục thủ công qua pgAdmin4 hoặc terminal.
                </div>

                <h6 className="fw-bold mt-3">Các bước thực hiện:</h6>
                <ol className="mb-3">
                  <li className="mb-2">Nhấn nút <strong>Tải về</strong> để tải file về máy tính.</li>
                  <li className="mb-2">
                    <strong>QUAN TRỌNG: Làm sạch Database cũ trước khi khôi phục</strong> (Để tránh lỗi xung đột)
                    <p className="mb-1 mt-1 small">Mở Query Tool trong pgAdmin4 (hoặc psql) và chạy lệnh sau:</p>
                    <pre className="bg-dark text-warning p-2 rounded small" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      {`DROP SCHEMA public CASCADE;\nCREATE SCHEMA public;`}
                    </pre>
                  </li>
                  <li className="mb-2">
                    <strong>Khôi phục file .dump (Khuyên dùng):</strong>
                    <p className="mb-1 mt-1 small">Cách 1: Sử dụng pgAdmin4 (Dễ nhất)</p>
                    <ul className="small mb-2">
                      <li>Chuột phải vào Database → <strong>Restore</strong>.</li>
                      <li>Chọn Format là "Custom or tar", chọn file vừa tải về.</li>
                      <li>Nhấn nút Restore (Không cần chọn Clean before restore vì đã chạy lệnh trên).</li>
                    </ul>
                    <p className="mb-1 small">Cách 2: Sử dụng lệnh <code>pg_restore</code> qua Terminal/PowerShell</p>
                    <pre className="bg-dark text-light p-2 rounded small" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      {`pg_restore --no-owner --no-privileges --dbname="<DATABASE_URL>" --verbose "${restoreGuideName}"`}
                    </pre>
                  </li>
                  <li className="mb-2">
                    <strong>Trường hợp file .sql:</strong>
                    <pre className="bg-dark text-light p-2 rounded small mt-2" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      {`psql "<DATABASE_URL>" -f "${restoreGuideName}"`}
                    </pre>
                  </li>
                  <li>Đăng nhập lại sau khi khôi phục hoàn tất.</li>
                </ol>

                <div className="alert alert-info mb-0 small">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>DATABASE_URL</strong> được tìm thấy trong file <code>.env.local</code> của dự án.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRestoreGuideModal(false)}>Đóng</button>
                <a 
                  href={backups.find(b => b.name === restoreGuideName)?.url || '#'}
                  download={restoreGuideName}
                  className="btn btn-warning"
                  onClick={() => setShowRestoreGuideModal(false)}
                >
                  <i className="fas fa-download me-2"></i>Tải file ngay
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BackupPage() {
  return (
    <AdminRoute>
      <BackupPageContent />
    </AdminRoute>
  );
}
