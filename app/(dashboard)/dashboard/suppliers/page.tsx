'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import api from '@/lib/utils/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { toast } from 'react-toastify';
import { Supplier } from '@/types/supplier';
import Loading from '@/components/Loading';
import Select from 'react-select';

export interface SupplierCategory {
  ID: number;
  Name: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    Name: '',
    CategoryIDs: [],
    TaxCode: '',
    ContactPerson: '',
    Phone: '',
    Zalo: '',
    Email: '',
    Address: '',
    Notes: '',
    IsActive: true
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<SupplierCategory | null>(null);

  const { data: categoriesResponse, mutate: mutateCategories } = useSWR('/supplier-categories', fetcher);
  const categories: SupplierCategory[] = categoriesResponse?.data || [];

  const currentParams = useMemo(() => {
    return new URLSearchParams({
      categoryId: selectedCategoryId.toString(),
      search: searchKeyword,
      page: currentPage.toString(),
      limit: itemsPerPage.toString()
    }).toString();
  }, [selectedCategoryId, searchKeyword, currentPage, itemsPerPage]);

  const { data: response, isLoading, mutate } = useSWR(
    `/suppliers?${currentParams}`, 
    fetcher
  );

  useEffect(() => {
    if (response?.status) {
      setSuppliers(response.data || []);
      setTotalItems(response.total || 0);
    }
  }, [response]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  const handleNew = () => {
    setIsEdit(false);
    setSelectedId(null);
    setFormData({
      Name: '',
      CategoryIDs: [],
      TaxCode: '',
      ContactPerson: '',
      Phone: '',
      Zalo: '',
      Email: '',
      Address: '',
      Notes: '',
      IsActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setIsEdit(true);
    setSelectedId(supplier.ID);
    setFormData({
      Name: supplier.Name || '',
      CategoryIDs: supplier.CategoryIDs || [],
      TaxCode: supplier.TaxCode || '',
      ContactPerson: supplier.ContactPerson || '',
      Phone: supplier.Phone || '',
      Zalo: supplier.Zalo || '',
      Email: supplier.Email || '',
      Address: supplier.Address || '',
      Notes: supplier.Notes || '',
      IsActive: supplier.IsActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) return;

    try {
      const res = await api.delete(`/suppliers/${id}`);
      if (res.data.status) {
        toast.success('Xóa thành công');
        mutate();
      } else {
        toast.error(res.data.error || 'Lỗi khi xóa');
      }
    } catch (error) {
      toast.error('Lỗi khi xóa nhà cung cấp');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Name) {
      toast.error('Vui lòng nhập tên nhà cung cấp');
      return;
    }

    try {
      if (isEdit && selectedId) {
        await api.put(`/suppliers/${selectedId}`, formData);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Thêm mới thành công');
      }
      setShowModal(false);
      mutate();
    } catch (error) {
      toast.error(isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới');
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Vui lòng nhập tên phân loại');
      return;
    }
    try {
      if (editingCategory) {
        await api.put(`/supplier-categories/${editingCategory.ID}`, { Name: categoryName });
        toast.success('Cập nhật phân loại thành công');
      } else {
        await api.post('/supplier-categories', { Name: categoryName });
        toast.success('Thêm phân loại thành công');
      }
      setCategoryName('');
      setEditingCategory(null);
      mutateCategories();
    } catch (error) {
      toast.error('Lỗi khi lưu phân loại');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phân loại này?')) return;
    try {
      await api.delete(`/supplier-categories/${id}`);
      toast.success('Xóa phân loại thành công');
      mutateCategories();
    } catch (error) {
      toast.error('Lỗi khi xóa phân loại');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="container-fluid px-3 py-2 main-content-wrapper">
      {/* Compact Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-2 gap-2 bg-white p-2 px-3 rounded-3 shadow-sm border">
        <div className="d-flex align-items-center">
          <div className="bg-primary text-white p-2 rounded-2 me-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px' }}>
            <i className="fas fa-handshake fa-sm"></i>
          </div>
          <h1 className="h6 mb-0 text-dark fw-bold text-uppercase">QUẢN LÝ NHÀ CUNG CẤP</h1>
          <div className="vr mx-3 d-none d-md-block" style={{ height: '20px' }}></div>
          <div className="d-none d-md-flex gap-3">
            <span className="small text-muted">Tổng NCC: <strong>{totalItems}</strong></span>
          </div>
        </div>
        <div className="d-flex gap-1">
          <button className="btn btn-outline-secondary btn-sm px-3 fw-bold shadow-sm text-dark" onClick={() => setShowCategoryModal(true)}>
            <i className="fas fa-list me-1"></i> Quản lý phân loại
          </button>
          <button className="btn btn-primary btn-sm px-3 fw-bold shadow-sm" onClick={handleNew}>
            <i className="fas fa-plus me-1"></i> Thêm mới
          </button>
        </div>
      </div>

      {/* Dense Filters */}
      <div className="card shadow-sm border-0 mb-2 rounded-3 overflow-hidden border">
        <div className="card-body p-2 bg-light bg-opacity-50">
          <div className="row g-2">
            <div className="col-md-5">
              <div className="input-group input-group-sm border shadow-none rounded-2 overflow-hidden bg-white">
                <span className="input-group-text bg-white border-0 pe-0">
                  <i className="fas fa-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-0 shadow-none py-1"
                  placeholder="Tìm tên, số điện thoại, MST..."
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm border shadow-none rounded-2"
                value={selectedCategoryId}
                onChange={(e) => { setSelectedCategoryId(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={0}>Tất cả phân loại</option>
                {categories.map(c => (
                  <option key={c.ID} value={c.ID}>{c.Name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select form-select-sm border shadow-none rounded-2"
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10 dòng</option>
                <option value={25}>25 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-dark btn-sm w-100 rounded-2" onClick={() => mutate()}>
                <i className="fas fa-sync-alt me-1"></i> Tải lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra-Dense Table */}
      <div className="card shadow-sm border-0 rounded-3 overflow-hidden border">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 custom-dense-table">
              <thead className="bg-dark text-white">
                <tr>
                  <th className="px-3 py-2 text-uppercase small-font" style={{ width: '50px' }}>STT</th>
                  <th className="py-2 text-uppercase small-font">Tên & Thông tin chung</th>
                  <th className="py-2 text-uppercase small-font">Ngành kinh doanh</th>
                  <th className="py-2 text-uppercase small-font">Thông tin liên hệ</th>
                  <th className="py-2 text-uppercase small-font text-end px-3" style={{ width: '100px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-4"><Loading /></td></tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <div className="text-muted small">Không tìm thấy nhà cung cấp nào</div>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier, index) => (
                    <tr key={supplier.ID}>
                      <td className="px-3 text-muted x-small fw-medium">{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                      <td className="py-2">
                        <div className="d-flex align-items-start">
                          <div className="p-1 rounded-1 me-2 d-flex align-items-center justify-content-center border bg-light text-primary border-light-subtle" style={{ width: '28px', height: '28px' }}>
                            <i className="fas fa-building x-small"></i>
                          </div>
                          <div className="lh-sm">
                            <div className="fw-bold text-dark small-font">{supplier.Name}</div>
                            <div className="x-small text-muted mt-1">
                              {supplier.TaxCode && <span className="me-2"><i className="fas fa-file-invoice text-muted me-1"></i>MST: {supplier.TaxCode}</span>}
                              {supplier.Address && <span><i className="fas fa-map-marker-alt text-muted me-1"></i>{supplier.Address}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-1">
                        {supplier.Categories && supplier.Categories.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {supplier.Categories.map(c => (
                              <span key={c.ID} className="x-small fw-medium text-dark bg-light px-2 py-0.5 border rounded">
                                {c.Name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="x-small fw-medium text-muted bg-light px-2 py-0.5 border rounded">Khác</span>
                        )}
                      </td>
                      <td className="py-1">
                        <div className="d-flex flex-column gap-1 x-small text-muted">
                          {supplier.ContactPerson && <div><i className="fas fa-user w-15px text-center me-1"></i>{supplier.ContactPerson}</div>}
                          {supplier.Phone && <div><i className="fas fa-phone w-15px text-center me-1"></i>{supplier.Phone}</div>}
                          {supplier.Zalo && <div><i className="fas fa-comment-dots w-15px text-center text-primary me-1"></i>Zalo: {supplier.Zalo}</div>}
                          {supplier.Email && <div><i className="fas fa-envelope w-15px text-center me-1"></i>{supplier.Email}</div>}
                          {!supplier.ContactPerson && !supplier.Phone && !supplier.Zalo && !supplier.Email && '—'}
                        </div>
                      </td>
                      <td className="px-3 text-end">
                        <div className="btn-group btn-group-xs shadow-none">
                          <button className="btn btn-outline-primary btn-xs px-2" title="Sửa" onClick={() => handleEdit(supplier)}>
                            <i className="fas fa-pen"></i>
                          </button>
                          <button className="btn btn-outline-danger btn-xs px-2" title="Xóa" onClick={() => handleDelete(supplier.ID)}>
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compact Pagination */}
        {!loading && suppliers.length > 0 && (
          <div className="card-footer bg-white border-top-0 py-2 d-flex justify-content-between align-items-center">
            <div className="x-small text-muted">
              Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} đến {Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} NCC
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0 gap-1">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link border-0 bg-light rounded" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>&laquo;</button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button className="page-link border-0 rounded" onClick={() => setCurrentPage(page)}>{page}</button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link border-0 bg-light rounded" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>&raquo;</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light py-2">
                <h6 className="modal-title fw-bold text-dark mb-0">
                  <i className={`fas ${isEdit ? 'fa-pen text-primary' : 'fa-plus-circle text-success'} me-2`}></i>
                  {isEdit ? 'CẬP NHẬT NHÀ CUNG CẤP' : 'THÊM NHÀ CUNG CẤP MỚI'}
                </h6>
                <button type="button" className="btn-close btn-sm" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body py-3">
                  <div className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label small-font fw-bold mb-1">Tên nhà cung cấp <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={formData.Name}
                        onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                        placeholder="Nhập tên công ty, đối tác..."
                      />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small-font fw-bold mb-1">Mã số thuế</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.TaxCode || ''}
                        onChange={(e) => setFormData({ ...formData, TaxCode: e.target.value })}
                        placeholder="VD: 0312345678"
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label small-font fw-bold mb-1">Ngành kinh doanh (Phân loại)</label>
                      <Select
                        isMulti
                        options={categories.map(c => ({ value: c.ID, label: c.Name }))}
                        value={categories
                          .filter(c => formData.CategoryIDs?.includes(c.ID))
                          .map(c => ({ value: c.ID, label: c.Name }))}
                        onChange={(selected) => {
                          setFormData({ 
                            ...formData, 
                            CategoryIDs: selected ? selected.map((s: any) => s.value) : [] 
                          });
                        }}
                        placeholder="Chọn ngành kinh doanh..."
                        noOptionsMessage={() => "Không có dữ liệu"}
                        className="basic-multi-select small-font"
                        classNamePrefix="select"
                        styles={{ control: (base) => ({ ...base, minHeight: '31px' }) }}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label small-font fw-bold mb-1">Người liên hệ</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.ContactPerson || ''}
                        onChange={(e) => setFormData({ ...formData, ContactPerson: e.target.value })}
                        placeholder="Tên người liên hệ"
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label small-font fw-bold mb-1">Số điện thoại</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.Phone || ''}
                        onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                        placeholder="SĐT liên hệ"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small-font fw-bold mb-1">Zalo</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.Zalo || ''}
                        onChange={(e) => setFormData({ ...formData, Zalo: e.target.value })}
                        placeholder="SĐT Zalo"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small-font fw-bold mb-1">Email</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={formData.Email || ''}
                        onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                        placeholder="Email liên hệ"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small-font fw-bold mb-1">Địa chỉ</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.Address || ''}
                        onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                        placeholder="Địa chỉ trụ sở"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small-font fw-bold mb-1">Ghi chú</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={formData.Notes || ''}
                        onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                        placeholder="Thông tin thêm..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button type="button" className="btn btn-light border btn-sm px-3 fw-bold shadow-sm" onClick={() => setShowModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold shadow-sm">
                    <i className="fas fa-save me-1"></i> Lưu thông tin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý phân loại */}
      {showCategoryModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light py-2">
                <h6 className="modal-title fw-bold text-dark mb-0">QUẢN LÝ PHÂN LOẠI</h6>
                <button type="button" className="btn-close btn-sm" onClick={() => setShowCategoryModal(false)}></button>
              </div>
              <div className="modal-body p-3">
                <div className="input-group input-group-sm mb-3 shadow-sm rounded">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Nhập tên phân loại..." 
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                  />
                  <button className={`btn ${editingCategory ? 'btn-success' : 'btn-primary'} fw-bold px-3`} onClick={handleSaveCategory}>
                    <i className={`fas ${editingCategory ? 'fa-check' : 'fa-plus'} me-1`}></i> {editingCategory ? 'Lưu' : 'Thêm'}
                  </button>
                  {editingCategory && (
                    <button className="btn btn-light border fw-bold" onClick={() => {
                      setEditingCategory(null);
                      setCategoryName('');
                    }}>Hủy</button>
                  )}
                </div>
                
                <ul className="list-group list-group-flush border rounded shadow-sm">
                  {categories.map(c => (
                    <li key={c.ID} className="list-group-item d-flex justify-content-between align-items-center py-2 small-font">
                      <span className="fw-medium">{c.Name}</span>
                      <div className="btn-group btn-group-xs shadow-none">
                        <button 
                          className="btn btn-outline-primary btn-xs px-2"
                          onClick={() => {
                            setEditingCategory(c);
                            setCategoryName(c.Name);
                          }}
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger btn-xs px-2"
                          onClick={() => handleDeleteCategory(c.ID)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </li>
                  ))}
                  {categories.length === 0 && (
                     <li className="list-group-item text-muted text-center py-3 small-font bg-light">Chưa có phân loại nào</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .w-15px { width: 15px; }
        .small-font { font-size: 0.85rem; }
        .x-small { font-size: 0.75rem; }
        .btn-xs { padding: 0.15rem 0.4rem; font-size: 0.7rem; }
        .table-sm td, .table-sm th { padding: 0.4rem 0.5rem; }
        .custom-dense-table tbody tr { height: 40px; }
        .page-link { min-width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; }
        .page-item.active .page-link { background-color: #2c3e50 !important; }
      `}</style>
    </div>
  );
}
