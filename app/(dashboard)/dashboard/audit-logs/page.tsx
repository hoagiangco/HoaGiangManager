'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import Loading from '@/components/Loading';
import { formatDateTime } from '@/lib/utils/dateFormat';
import SuperAdminRoute from '@/components/SuperAdminRoute';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const limit = 20;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(tableFilter ? { tableName: tableFilter } : {})
  }).toString();

  const { data: response, isLoading } = useSWR('/audit-logs?' + queryParams, fetcher);
  const logs = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <SuperAdminRoute>
    <div className="container-fluid">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h4 className="mb-0">NHẬT KÝ THAO TÁC HỆ THỐNG</h4>
        </div>
        
        <div className="card-body bg-light p-3 border-bottom">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small mb-1">Loại thao tác</label>
              <select className="form-select form-select-sm" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
                <option value="">Tất cả</option>
                <option value="CREATE">Tạo mới (CREATE)</option>
                <option value="UPDATE">Cập nhật (UPDATE)</option>
                <option value="DELETE">Xóa (DELETE)</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-1">Module (Bảng)</label>
              <select className="form-select form-select-sm" value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(1); }}>
                <option value="">Tất cả</option>
                <option value="Device">Thiết bị (Device)</option>
                <option value="SparePart">Vật tư (SparePart)</option>
                <option value="DamageReports">Báo cáo (DamageReports)</option>
                <option value="WorkPlans">Bảo trì/Kế hoạch (WorkPlans)</option>
                <option value="Events">Sự kiện (Events)</option>
                <option value="DeviceReminderPlans">Lịch bảo trì (ReminderPlans)</option>
                <option value="Users">Người dùng (Users)</option>
                <option value="Staff">Nhân sự (Staff)</option>
                <option value="Departments">Phòng ban (Departments)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Thời gian</th>
                  <th>Người thao tác</th>
                  <th>Hành động</th>
                  <th>Module</th>
                  <th>Mã (ID)</th>
                  <th>Chi tiết thay đổi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-4"><Loading /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4">Không có nhật ký</td></tr>
                ) : (
                  logs.map((log: any) => {
                    const ActionBadge = log.Action === 'CREATE' ? 'bg-success' : log.Action === 'UPDATE' ? 'bg-warning text-dark' : 'bg-danger';
                    return (
                    <tr key={log.Id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.CreatedAt)}</td>
                      <td>
                        <div className="fw-bold">{log.FullName}</div>
                        <small className="text-muted">{log.Email}</small>
                      </td>
                      <td>
                        <span className={"badge " + ActionBadge}>
                          {log.Action}
                        </span>
                      </td>
                      <td>{log.TableName}</td>
                      <td>{log.RecordId}</td>
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.8rem' }}>
                          {log.Action === 'UPDATE' && (
                            <details>
                              <summary className="text-primary" style={{cursor: 'pointer'}}>Xem thay đổi</summary>
                              <div className="mt-1 p-2 bg-light border rounded">
                                <strong className="d-block text-danger border-bottom mb-1">Cũ:</strong>
                                <pre className="mb-2 text-wrap">{JSON.stringify(log.OldValues, null, 2)}</pre>
                                <strong className="d-block text-success border-bottom mb-1">Mới:</strong>
                                <pre className="mb-0 text-wrap">{JSON.stringify(log.NewValues, null, 2)}</pre>
                              </div>
                            </details>
                          )}
                          {log.Action === 'DELETE' && (
                            <details>
                              <summary className="text-primary" style={{cursor: 'pointer'}}>Xem dữ liệu bị xóa</summary>
                              <pre className="mt-1 p-2 bg-light border rounded text-wrap">{JSON.stringify(log.OldValues, null, 2)}</pre>
                            </details>
                          )}
                          {log.Action === 'CREATE' && (
                            <details>
                              <summary className="text-primary" style={{cursor: 'pointer'}}>Xem dữ liệu mới</summary>
                              <pre className="mt-1 p-2 bg-light border rounded text-wrap">{JSON.stringify(log.NewValues, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="card-footer bg-white border-top py-3">
            <div className="d-flex justify-content-between align-items-center">
              <span className="small text-muted">Trang {page} / {totalPages} ({total} bản ghi)</span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <i className="fas fa-chevron-left me-1"></i> Trước
                </button>
                <button className="btn btn-outline-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Sau <i className="fas fa-chevron-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </SuperAdminRoute>
  );
}
