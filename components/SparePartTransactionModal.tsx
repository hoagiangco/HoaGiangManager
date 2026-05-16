'use client';

import { useState, useEffect } from 'react';
import { SparePart, SparePartVM, SparePartTransactionType } from '@/types';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';

interface TransactionModalProps {
  show: boolean;
  onClose: () => void;
  onSave: () => void;
  item: SparePart | null;
  defaultType?: SparePartTransactionType;
}

export default function SparePartTransactionModal({ show, onClose, onSave, item, defaultType = SparePartTransactionType.In }: TransactionModalProps) {
  const [formData, setFormData] = useState({
    sparePartId: item?.id || 0,
    type: defaultType,
    quantity: 1,
    transactionDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    note: '',
    relatedReportId: ''
  });

  const { data: allPartsData } = useSWR(show && !item ? '/spare-parts?limit=200' : null, fetcher);
  const allParts = allPartsData?.data || [];

  useEffect(() => {
    if (show) {
      setFormData({
        sparePartId: item?.id || 0,
        type: defaultType,
        quantity: 1,
        transactionDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        note: '',
        relatedReportId: ''
      });
    }
  }, [show, item, defaultType]);

  if (!show) return null;

  const currentItem = item || allParts.find((p: SparePart) => p.id === formData.sparePartId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sparePartId && !item) { toast.error('Vui lòng chọn vật tư'); return; }
    if (!formData.note.trim()) { toast.error('Vui lòng nhập ghi chú'); return; }

    try {
      await api.post('/spare-part-transactions', {
        sparePartId: item?.id || formData.sparePartId,
        type: formData.type,
        quantity: formData.quantity,
        transactionDate: formData.transactionDate,
        note: formData.note,
        relatedReportId: formData.relatedReportId ? parseInt(formData.relatedReportId) : null
      });
      toast.success('Giao dịch thành công');
      onSave();
      onClose();
    } catch (error: any) {
      toast.error('Lỗi khi thực hiện giao dịch');
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-sm-custom">
        <div className="modal-content border-0 shadow rounded-3">
          <div className={`modal-header py-2 px-3 border-0 ${formData.type === SparePartTransactionType.In ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
            <h6 className="modal-title fw-bold mb-0">
              <i className={`fas ${formData.type === SparePartTransactionType.In ? 'fa-arrow-down' : 'fa-arrow-up'} me-2`}></i>
              {formData.type === SparePartTransactionType.In ? 'Nhập kho' : 'Xuất kho'}
            </h6>
            <button type="button" className={`btn-close btn-close-sm ${formData.type === SparePartTransactionType.In ? 'btn-close-white' : ''}`} onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-3">
              {!item ? (
                <div className="mb-2">
                  <label className="x-small-label fw-bold text-muted">CHỌN VẬT TƯ</label>
                  <select 
                    className="form-select form-select-sm"
                    value={formData.sparePartId}
                    onChange={(e) => setFormData({ ...formData, sparePartId: parseInt(e.target.value) })}
                    required
                  >
                    <option value={0}>-- Chọn vật tư --</option>
                    {allParts.map((p: SparePart) => (
                      <option key={p.id} value={p.id}>{p.name} (Tồn: {p.currentQuantity})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mb-2 p-2 bg-light rounded border text-center">
                  <div className="fw-bold small">{item.name}</div>
                  <div className="x-small text-muted">Tồn hiện tại: <strong>{item.currentQuantity} {item.unit}</strong></div>
                </div>
              )}

              <div className="row g-2 mb-2">
                <div className="col-6">
                  <label className="x-small-label fw-bold text-muted">LOẠI</label>
                  <select className="form-select form-select-sm" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as any})}>
                    <option value="IN">Nhập kho</option>
                    <option value="OUT">Xuất kho</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="x-small-label fw-bold text-muted">SỐ LƯỢNG ({currentItem?.unit || 'ĐV'})</label>
                  <input type="number" className="form-control form-control-sm fw-bold" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} min="1" required />
                </div>
              </div>

              <div className="mb-2">
                <label className="x-small-label fw-bold text-muted">THỜI GIAN THỰC HIỆN</label>
                <input type="datetime-local" className="form-control form-control-sm" value={formData.transactionDate} onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} required />
              </div>
              
              {formData.type === SparePartTransactionType.Out && (
                <div className="mb-2">
                  <label className="x-small-label fw-bold text-muted">PHIẾU BÁO HƯ # (NẾU CÓ)</label>
                  <input type="number" className="form-control form-control-sm" value={formData.relatedReportId} onChange={(e) => setFormData({ ...formData, relatedReportId: e.target.value })} placeholder="ID phiếu..." />
                </div>
              )}
              
              <div className="mb-0">
                <label className="x-small-label fw-bold text-muted">GHI CHÚ <span className="text-danger">*</span></label>
                <textarea className="form-control form-control-sm" rows={2} value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Lý do, người nhận..." required></textarea>
              </div>
            </div>
            <div className="modal-footer py-2 px-3 bg-light border-0">
              <button type="button" className="btn btn-sm btn-link text-muted text-decoration-none x-small-font fw-bold" onClick={onClose}>Đóng</button>
              <button type="submit" className={`btn btn-sm ${formData.type === SparePartTransactionType.In ? 'btn-success' : 'btn-warning'} px-4 fw-bold`}>
                XÁC NHẬN
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        .x-small-label { font-size: 0.65rem; display: block; margin-bottom: 2px; }
        .x-small-font { font-size: 0.75rem; }
        .modal-sm-custom { max-width: 350px; }
      `}</style>
    </div>
  );
}
