'use client';

import { useState, useEffect } from 'react';
import { SparePart, SparePartCategory } from '@/types';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { mutate } from 'swr';

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
  const [showCategoryManager, setShowCategoryManager] = useState(false);


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
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="x-small-label fw-bold text-primary mb-0">DANH MỤC</label>
                    <button type="button" className="btn btn-link p-0 text-decoration-none x-small-font" onClick={() => setShowCategoryManager(true)}>
                      <i className="fas fa-cog me-1"></i> Quản lý danh mục
                    </button>
                  </div>
                  <select className="form-select form-select-sm border-primary" value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}>
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
      
      <CategoryManagerModal show={showCategoryManager} onClose={() => setShowCategoryManager(false)} categories={categories} />
    </div>
  );
}

function CategoryManagerModal({ show, onClose, categories }: { show: boolean, onClose: () => void, categories: SparePartCategory[] }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');

  if (!show) return null;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/spare-part-categories', { name: newName, description: '' });
      toast.success('Thêm danh mục thành công');
      setNewName('');
      mutate('/spare-part-categories');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi thêm danh mục');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/spare-part-categories/${id}`, { name: editName });
      toast.success('Cập nhật thành công');
      setEditingId(null);
      mutate('/spare-part-categories');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi cập nhật');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      await api.delete(`/spare-part-categories/${id}`);
      toast.success('Xóa danh mục thành công');
      mutate('/spare-part-categories');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1070 }}>
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content border-0 shadow rounded-3">
          <div className="modal-header py-2 px-3 bg-light border-bottom">
            <h6 className="modal-title fw-bold mb-0 text-dark">Quản lý danh mục</h6>
            <button type="button" className="btn-close btn-close-sm" onClick={onClose}></button>
          </div>
          <div className="modal-body p-3">
            <div className="input-group input-group-sm mb-3 shadow-sm">
              <input type="text" className="form-control" placeholder="Tên danh mục mới..." value={newName} onChange={e => setNewName(e.target.value)} />
              <button className="btn btn-primary" onClick={handleAdd}><i className="fas fa-plus"></i></button>
            </div>
            
            <div className="list-group list-group-flush border rounded-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {categories.length === 0 && <div className="p-2 text-center text-muted x-small-font">Chưa có danh mục</div>}
              {categories.map(c => (
                <div key={c.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-2">
                  {editingId === c.id ? (
                    <div className="input-group input-group-sm w-100">
                      <input type="text" className="form-control form-control-sm" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                      <button className="btn btn-success" onClick={() => handleUpdate(c.id)}><i className="fas fa-check"></i></button>
                      <button className="btn btn-light border" onClick={() => setEditingId(null)}><i className="fas fa-times"></i></button>
                    </div>
                  ) : (
                    <>
                      <span className="small-font text-truncate pe-2">{c.name}</span>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-link text-primary p-0 me-2" onClick={() => { setEditingId(c.id); setEditName(c.name); }}>
                          <i className="fas fa-pen x-small-font"></i>
                        </button>
                        <button className="btn btn-link text-danger p-0" onClick={() => handleDelete(c.id)}>
                          <i className="fas fa-trash x-small-font"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

