'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
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

  // Print State
  const [printItem, setPrintItem] = useState<SparePartTransactionVM | null>(null);
  const [isPrintingReport, setIsPrintingReport] = useState(false);

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

  const handlePrintItem = (item: SparePartTransactionVM) => {
    setPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintReport = () => {
    setIsPrintingReport(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Clear print item after print dialog closes
  useEffect(() => {
    const afterPrint = () => {
      setPrintItem(null);
      setIsPrintingReport(false);
    };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  return (
    <AdminRoute>
      <div className={`container-fluid px-3 py-2 main-content-wrapper ${printItem || isPrintingReport ? 'printing-item' : ''}`}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-2 bg-white p-2 px-3 rounded-3 shadow-sm border">
          <div className="d-flex align-items-center">
            <div className="bg-secondary text-white p-2 rounded-2 me-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px' }}>
              <i className="fas fa-file-invoice fa-sm"></i>
            </div>
            <h1 className="h6 mb-0 text-dark fw-bold text-uppercase">Danh sách phiếu Nhập / Xuất kho</h1>
          </div>
          <button className="btn btn-light border shadow-sm btn-sm px-3 fw-bold text-dark" onClick={handlePrintReport}>
            <i className="fas fa-print text-primary me-1"></i> In báo cáo
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
                              <div className="d-flex opacity-0 edit-btn">
                                <button className="btn btn-link btn-xs p-0 text-primary me-2" onClick={() => startEdit(item)} title="Sửa ghi chú">
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button className="btn btn-link btn-xs p-0 text-secondary" onClick={() => handlePrintItem(item)} title="In phiếu">
                                  <i className="fas fa-print"></i>
                                </button>
                              </div>
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

      {/* Print Receipt Template */}
      {printItem && (
        <div className="print-receipt-container">
          <div className="text-center mb-4 pb-2 border-bottom">
            <h2 className="fw-bold mb-1 text-uppercase">
              {printItem.type === SparePartTransactionType.In ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}
            </h2>
            <p className="mb-0 text-dark fs-5">
              Số: {printItem.type === SparePartTransactionType.In ? 'PN-' : 'PX-'}{printItem.id.toString().padStart(5, '0')}
            </p>
            <p className="mb-0 text-muted">Ngày lập: {formatDateTime(printItem.transactionDate)}</p>
          </div>
          
          <div className="mb-4 fs-5">
            <div className="row mb-2">
              <div className="col-3 fw-bold">Người lập phiếu:</div>
              <div className="col-9">{printItem.createdByName || 'Hệ thống'}</div>
            </div>
            <div className="row mb-2">
              <div className="col-3 fw-bold">Lý do / Ghi chú:</div>
              <div className="col-9">{printItem.note || '—'}</div>
            </div>
            {printItem.relatedReportId && (
              <div className="row mb-2">
                <div className="col-3 fw-bold">Kèm phiếu báo hư:</div>
                <div className="col-9">#{printItem.relatedReportId}</div>
              </div>
            )}
          </div>

          <table className="table table-bordered mb-5">
            <thead className="table-light">
              <tr>
                <th className="text-center py-3" style={{ width: '60px' }}>STT</th>
                <th className="py-3">Tên vật tư</th>
                <th className="text-center py-3" style={{ width: '120px' }}>ĐVT</th>
                <th className="text-center py-3" style={{ width: '150px' }}>Số lượng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center fs-5 py-3">1</td>
                <td className="fs-5 py-3 fw-bold">{printItem.sparePartName}</td>
                <td className="text-center fs-5 py-3">{printItem.sparePartUnit}</td>
                <td className="text-center fs-5 py-3 fw-bold">{printItem.quantity}</td>
              </tr>
            </tbody>
          </table>

          <div className="row text-center mt-5 pt-4">
            <div className="col-4">
              <p className="fw-bold fs-5 mb-5 pb-5">Người lập phiếu</p>
              <p className="text-muted mt-5 pt-3">(Ký, họ tên)</p>
            </div>
            <div className="col-4">
              <p className="fw-bold fs-5 mb-5 pb-5">{printItem.type === SparePartTransactionType.In ? 'Người giao' : 'Người nhận'}</p>
              <p className="text-muted mt-5 pt-3">(Ký, họ tên)</p>
            </div>
            <div className="col-4">
              <p className="fw-bold fs-5 mb-5 pb-5">Thủ kho</p>
              <p className="text-muted mt-5 pt-3">(Ký, họ tên)</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Report Template */}
      {isPrintingReport && (
        <div className="print-report-container">
          <div className="text-center mb-4">
            <h2 className="fw-bold mb-1 text-uppercase">BÁO CÁO NHẬP XUẤT KHO</h2>
            <p className="mb-0 fs-5">
              Từ ngày: {startDate ? startDate.split('-').reverse().join('/') : '...'} - Đến ngày: {endDate ? endDate.split('-').reverse().join('/') : '...'}
            </p>
            <p className="mb-0 text-muted fs-6">
              Loại phiếu: {type === SparePartTransactionType.In ? 'Nhập kho' : type === SparePartTransactionType.Out ? 'Xuất kho' : 'Tất cả'}
            </p>
          </div>
          
          <table className="table table-bordered mb-5">
            <thead className="table-light">
              <tr>
                <th className="text-center py-2" style={{ width: '50px' }}>STT</th>
                <th className="py-2 text-center" style={{ width: '100px' }}>Số phiếu</th>
                <th className="py-2 text-center" style={{ width: '120px' }}>Ngày lập</th>
                <th className="py-2">Tên vật tư</th>
                <th className="text-center py-2" style={{ width: '80px' }}>ĐVT</th>
                <th className="text-center py-2" style={{ width: '80px' }}>Loại</th>
                <th className="text-center py-2" style={{ width: '100px' }}>Số lượng</th>
                <th className="py-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {response?.data?.map((item: SparePartTransactionVM, idx: number) => (
                <tr key={item.id}>
                  <td className="text-center fs-6">{idx + 1 + (page - 1) * itemsPerPage}</td>
                  <td className="text-center fs-6">
                    {item.type === SparePartTransactionType.In ? 'PN-' : 'PX-'}
                    {item.id.toString().padStart(5, '0')}
                  </td>
                  <td className="text-center fs-6">{formatDateTime(item.transactionDate).split(' ')[0]}</td>
                  <td className="fs-6 fw-bold">{item.sparePartName}</td>
                  <td className="text-center fs-6">{item.sparePartUnit}</td>
                  <td className="text-center fs-6">{item.type === SparePartTransactionType.In ? 'Nhập' : 'Xuất'}</td>
                  <td className="text-center fs-6 fw-bold">{item.type === SparePartTransactionType.In ? '+' : '-'}{item.quantity}</td>
                  <td className="fs-6">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="row text-center mt-5 pt-4">
            <div className="col-6">
              <p className="fw-bold fs-5 mb-5 pb-5">Người lập báo cáo</p>
              <p className="text-muted mt-5 pt-3">(Ký, họ tên)</p>
            </div>
            <div className="col-6">
              <p className="fw-bold fs-5 mb-5 pb-5">Thủ trưởng đơn vị</p>
              <p className="text-muted mt-5 pt-3">(Ký, họ tên)</p>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Print Orientation */}
      {isPrintingReport && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 landscape; margin: 0; }
          }
        `}} />
      )}
      {!isPrintingReport && printItem && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 0; }
          }
        `}} />
      )}

      <style jsx global>{`
        .small-font { font-size: 0.85rem; }
        .x-small { font-size: 0.75rem; }
        .x-small-font { font-size: 0.75rem; }
        .x-small-label { font-size: 0.65rem; display: block; margin-bottom: 2px; }
        .table-sm td, .table-sm th { padding: 0.4rem 0.5rem; }
        .btn-xs { padding: 0.1rem 0.3rem; font-size: 0.7rem; }
        .group-hover:hover .edit-btn { opacity: 1 !important; }
        .page-link { min-width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; }
        .page-item.active .page-link { background-color: #2c3e50 !important; }
        
        @media screen {
          .print-receipt-container, .print-report-container { display: none !important; }
        }
        
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          .top-navbar, .sidebar, .card-footer, .btn, .card:first-child { display: none !important; }
          .main-content { margin-left: 0 !important; padding: 0 !important; }
          .container-fluid { padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; }
          
          .printing-item { display: none !important; }
          .print-receipt-container, .print-report-container { 
            display: block !important; 
            padding: 2cm !important;
            font-family: 'Times New Roman', Times, serif;
            background: white;
          }
          .table-bordered th, .table-bordered td { border: 1px solid #000 !important; }
        }
      `}</style>
    </AdminRoute>
  );
}
