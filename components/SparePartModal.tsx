'use client';

import { useState, useEffect } from 'react';
import { SparePart, SparePartCategory } from '@/types';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

interface SparePartModalProps {
  show: boolean;
  onClose: () => void;
  onSave: () => void;
  item?: SparePart | null;
  categories: SparePartCategory[];
}

export default function SparePartModal({ show, onClose, onSave, item, categories }: SparePartModalProps) {
  const [formData, setFormData] = useState<Partial<SparePart>>({
    name: '',
    unit: '',
    categoryId: categories[0]?.id || 0,
    minQuantity: 0,
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        unit: item.unit,
        categoryId: item.categoryId,
        minQuantity: item.minQuantity,
        description: item.description,
        imageUrl: item.imageUrl
      });
    } else {
      setFormData({
        name: '',
        unit: '',
        categoryId: categories[0]?.id || 0,
        minQuantity: 0,
        description: '',
        imageUrl: ''
      });
    }
  }, [item, categories]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (item?.id) {
        await api.put(`/spare-parts/${item.id}`, formData);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/spare-parts', formData);
        toast.success('Đã thêm vật tư');
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error('Lỗi khi lưu thông tin');
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow rounded-3">
          <div className="modal-header py-2 px-3 bg-primary text-white border-0">
            <h6 className="modal-title fw-bold mb-0">{item ? 'Sửa vật tư' : 'Thêm vật tư mới'}</h6>
            <button type="button" className="btn-close btn-close-white btn-close-sm" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-3">
              <div className="row g-2">
                <div className="col-md-8">
                  <label className="x-small-label fw-bold text-muted">TÊN VẬT TƯ <span className="text-danger">*</span></label>
                  <input type="text" className="form-control form-control-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="x-small-label fw-bold text-muted">ĐƠN VỊ</label>
                  <input type="text" className="form-control form-control-sm" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="Cái, Bộ..." />
                </div>
                <div className="col-md-6">
                  <label className="x-small-label fw-bold text-muted">DANH MỤC</label>
                  <select className="form-select form-select-sm" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}>
                    <option value={0}>-- Chọn --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="x-small-label fw-bold text-muted">TỒN TỐI THIỂU</label>
                  <input type="number" className="form-control form-control-sm" value={formData.minQuantity} onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })} min="0" />
                </div>
                <div className="col-12">
                  <label className="x-small-label fw-bold text-muted">MÔ TẢ / GHI CHÚ</label>
                  <textarea className="form-control form-control-sm" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                </div>
              </div>
            </div>
            
            <div className="modal-footer py-2 px-3 bg-white border-0">
              <button type="button" className="btn btn-sm btn-light px-3 fw-bold text-muted x-small-font" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-sm btn-primary px-4 fw-bold shadow-sm">
                <i className="fas fa-save me-1"></i> LƯU LẠI
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        .x-small-label { font-size: 0.65rem; display: block; margin-bottom: 2px; }
        .x-small-font { font-size: 0.75rem; }
      `}</style>
    </div>
  );
}
