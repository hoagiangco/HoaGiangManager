'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { SparePartTransactionVM, SparePartTransactionType } from '@/types';
import Loading from '@/components/Loading';
import AdminRoute from '@/components/AdminRoute';
import { formatDateTime } from '@/lib/utils/dateFormat';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

export default function SparePartTransactionsPage() {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [type, setType] = useState<SparePartTransactionType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState('');

  const { data: response, isLoading, mutate } = useSWR(
    `/spare-part-transactions?offset=${(page - 1) * itemsPerPage}&limit=${itemsPerPage}&type=${type}&startDate=${startDate}&endDate=${endDate}`,
    fetcher
  );

  const startEdit = (item: SparePartTransactionVM) => {
    setEditingId(item.id);
    setEditNote(item.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
  };

  const saveEdit = async (id: number) => {
    try {
      await api.patch(`/spare-part-transactions/${id}`, { note: editNote });
      toast.success('Cập nhật ghi chú thành công');
      setEditingId(null);
      mutate();
    } catch (error) {
      toast.error('Lỗi khi cập nhật ghi chú');
    }
  };

  return (
    <AdminRoute>
      <div className="container-fluid px-3 py-2">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-2 bg-white p-2 px-3 rounded-3 shadow-sm border">
          <div className="d-flex align-items-center">
            <div className="bg-secondary text-white p-2 rounded-2 me-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px' }}>
              <i className="fas fa-file-invoice fa-sm"></i>
            </div>
            <h1 className="h6 mb-0 text-dark fw-bold text-uppercase">Danh sách phiếu Nhập / Xuất kho</h1>
          </div>
          <button className="btn btn-outline-secondary btn-sm px-3 fw-bold bg-white" onClick={() => window.print()}>
            <i className="fas fa-print me-1"></i> In báo cáo
          </button>
        </div>

        {/* Filters */}
        <div className="card shadow-sm border-0 mb-2 rounded-3 overflow-hidden border">
          <div className="card-body p-2 bg-light bg-opacity-50">
            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="x-small-label fw-bold text-muted">LOẠI PHIẾU</label>
                <select 
                  className="form-select form-select-sm"
                  value={type}
                  onChange={(e) => { setType(e.target.value as any); setPage(1); }}
                >
                  <option value="">Tất cả phiếu</option>
                  <option value="IN">Phiếu Nhập (+)</option>
                  <option value="OUT">Phiếu Xuất (-)</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="x-small-label fw-bold text-muted">TỪ NGÀY</label>
                <input type="date" className="form-control form-control-sm" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
              </div>
              <div className="col-md-3">
                <label className="x-small-label fw-bold text-muted">ĐẾN NGÀY</label>
                <input type="date" className="form-control form-control-sm" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
              </div>
              <div className="col-md-2">
                <label className="x-small-label fw-bold text-muted">HIỂN THỊ</label>
                <select className="form-select form-select-sm" value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value))}>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary btn-sm w-100 fw-bold shadow-sm" onClick={() => setPage(1)}>
                  <i className="fas fa-search me-1"></i> Tra cứu
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card shadow-sm border-0 rounded-3 overflow-hidden border">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0 custom-dense-table">
                <thead className="bg-dark text-white">
                  <tr>
                    <th className="px-3 py-2 text-uppercase small-font" style={{ width: '90px' }}>Số Phiếu</th>
                    <th className="py-2 text-uppercase small-font" style={{ width: '140px' }}>Ngày giờ lập</th>
                    <th className="py-2 text-uppercase small-font">Tên vật tư</th>
                    <th className="py-2 text-uppercase small-font text-center" style={{ width: '80px' }}>Loại</th>
                    <th className="py-2 text-uppercase small-font text-center" style={{ width: '100px' }}>Số lượng</th>
                    <th className="py-2 text-uppercase small-font">Nội dung / Ghi chú</th>
                    <th className="py-2 text-uppercase small-font px-3" style={{ width: '130px' }}>Người lập</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-4"><Loading /></td></tr>
                  ) : response?.data?.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-5 text-muted x-small">Chưa có phiếu nào</td></tr>
                  ) : (
                    response?.data?.map((item: SparePartTransactionVM) => (
                      <tr key={item.id}>
                        <td className="px-3 fw-bold small-font">
                          {item.type === SparePartTransactionType.In ? 'PN-' : 'PX-'}
                          {item.id.toString().padStart(5, '0')}
                        </td>
                        <td className="x-small">
                          {formatDateTime(item.transactionDate)}
                        </td>
                        <td>
                          <div className="small-font fw-bold text-dark">{item.sparePartName}</div>
                          <div className="x-small text-muted">{item.sparePartUnit}</div>
                        </td>
                        <td className="text-center">
                          {item.type === SparePartTransactionType.In ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 x-small fw-bold">NHẬP</span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-0.5 text-dark x-small fw-bold">XUẤT</span>
                          )}
                        </td>
                        <td className="text-center fw-bold small-font">
                          <span className={item.type === SparePartTransactionType.In ? 'text-success' : 'text-danger'}>
                            {item.type === SparePartTransactionType.In ? '+' : '-'}{item.quantity}
                          </span>
                        </td>
                        <td className="lh-sm">
                          {editingId === item.id ? (
                            <div className="d-flex gap-1 align-items-center">
                              <input 
                                type="text" 
                                className="form-control form-control-sm x-small-font" 
                                value={editNote} 
                                onChange={(e) => setEditNote(e.target.value)}
                                autoFocus
                              />
                              <button className="btn btn-success btn-xs" onClick={() => saveEdit(item.id)}><i className="fas fa-check"></i></button>
                              <button className="btn btn-light btn-xs border" onClick={cancelEdit}><i className="fas fa-times"></i></button>
                            </div>
                          ) : (
                            <div className="d-flex justify-content-between align-items-center group-hover">
                              <span className="x-small text-muted">{item.note || '—'}</span>
                              <button className="btn btn-link btn-xs p-0 text-primary opacity-0 edit-btn" onClick={() => startEdit(item)}>
                                <i className="fas fa-edit"></i>
                              </button>
                            </div>
                          )}
                          {item.relatedReportId && (
                            <div className="mt-1">
                              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 x-small fw-bold">Phiếu hư #{item.relatedReportId}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 x-small fw-medium">
                          {item.createdByName || 'Hệ thống'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {response?.total > itemsPerPage && (
            <div className="card-footer bg-white border-top-0 py-2 d-flex justify-content-between align-items-center">
              <div className="x-small text-muted">Tổng số: {response.total} bản ghi</div>
              <nav>
                <ul className="pagination pagination-sm mb-0 gap-1">
                  {[...Array(Math.ceil(response.total / itemsPerPage))].map((_, i) => (
                    <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                      <button className="page-link border-0 rounded" onClick={() => setPage(i + 1)}>{i + 1}</button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .small-font { font-size: 0.85rem; }
        .x-small { font-size: 0.75rem; }
        .x-small-font { font-size: 0.75rem; }
        .x-small-label { font-size: 0.65rem; display: block; margin-bottom: 2px; }
        .table-sm td, .table-sm th { padding: 0.4rem 0.5rem; }
        .btn-xs { padding: 0.1rem 0.3rem; font-size: 0.7rem; }
        .group-hover:hover .edit-btn { opacity: 1 !important; }
        .page-link { min-width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; }
        .page-item.active .page-link { background-color: #2c3e50 !important; }
        @media print {
          .top-navbar, .sidebar, .card-footer, .btn, .card:first-child { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .container-fluid { padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </AdminRoute>
  );
}
