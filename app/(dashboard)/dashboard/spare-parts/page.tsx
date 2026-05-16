'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { SparePartVM, SparePartCategory, SparePartTransactionType } from '@/types';
import Loading from '@/components/Loading';
import SparePartModal from '@/components/SparePartModal';
import SparePartTransactionModal from '@/components/SparePartTransactionModal';
import AdminRoute from '@/components/AdminRoute';
import { toast } from 'react-toastify';
import api from '@/lib/utils/api';

export default function SparePartsPage() {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // Increased for more density
  const [search, setSearchKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SparePartVM | null>(null);
  
  const [showTransModal, setShowTransModal] = useState(false);
  const [transType, setTransType] = useState<SparePartTransactionType>(SparePartTransactionType.In);

  const { data: categoriesData } = useSWR('/spare-part-categories', fetcher);
  const categories = categoriesData?.data || [];

  const { data: response, isLoading, mutate } = useSWR(
    `/spare-parts?page=${page}&limit=${itemsPerPage}&categoryId=${categoryId}&search=${search}`,
    fetcher
  );

  const handleEdit = (item: SparePartVM) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleNew = () => {
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vật tư này?')) return;
    try {
      await api.delete(`/spare-parts/${id}`);
      toast.success('Xóa vật tư thành công');
      mutate();
    } catch (error) {
      toast.error('Lỗi khi xóa vật tư');
    }
  };

  const handleTransaction = (item: SparePartVM | null, type: SparePartTransactionType) => {
    setSelectedItem(item);
    setTransType(type);
    setShowTransModal(true);
  };

  return (
    <AdminRoute>
      <div className="container-fluid px-3 py-2">
        {/* Compact Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-2 gap-2 bg-white p-2 px-3 rounded-3 shadow-sm border">
          <div className="d-flex align-items-center">
            <div className="bg-primary text-white p-2 rounded-2 me-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px' }}>
              <i className="fas fa-boxes fa-sm"></i>
            </div>
            <h1 className="h6 mb-0 text-dark fw-bold">QUẢN LÝ VẬT TƯ DỰ PHÒNG</h1>
            <div className="vr mx-3 d-none d-md-block" style={{ height: '20px' }}></div>
            <div className="d-none d-md-flex gap-3">
              <span className="small text-muted">Tổng: <strong>{response?.total || 0}</strong></span>
              <span className="small text-danger">Sắp hết: <strong>{response?.data?.filter((i: SparePartVM) => i.isLowStock).length || 0}</strong></span>
            </div>
          </div>
          <div className="d-flex gap-1">
            <button className="btn btn-success btn-sm px-3 fw-bold shadow-sm" onClick={() => handleTransaction(null, SparePartTransactionType.In)}>
              <i className="fas fa-plus-circle me-1"></i> Nhập kho
            </button>
            <button className="btn btn-warning btn-sm px-3 fw-bold shadow-sm text-dark" onClick={() => handleTransaction(null, SparePartTransactionType.Out)}>
              <i className="fas fa-minus-circle me-1"></i> Xuất kho
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
                    placeholder="Tìm tên vật tư..."
                    value={search}
                    onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select 
                  className="form-select form-select-sm border shadow-none rounded-2"
                  value={categoryId}
                  onChange={(e) => { setCategoryId(parseInt(e.target.value)); setPage(1); }}
                >
                  <option value={0}>Tất cả danh mục</option>
                  {categories.map((c: SparePartCategory) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select 
                  className="form-select form-select-sm border shadow-none rounded-2"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setPage(1); }}
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
                    <th className="px-3 py-2 text-uppercase small-font" style={{ width: '40px' }}>ID</th>
                    <th className="py-2 text-uppercase small-font">Tên vật tư & Mô tả</th>
                    <th className="py-2 text-uppercase small-font">Danh mục</th>
                    <th className="py-2 text-uppercase small-font text-center" style={{ width: '100px' }}>Tồn kho</th>
                    <th className="py-2 text-uppercase small-font text-center" style={{ width: '100px' }}>Cảnh báo</th>
                    <th className="py-2 text-uppercase small-font text-end px-3" style={{ width: '180px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="text-center py-4"><Loading /></td></tr>
                  ) : response?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        <div className="text-muted small">Không tìm thấy vật tư nào</div>
                      </td>
                    </tr>
                  ) : (
                    response?.data?.map((item: SparePartVM, index: number) => (
                      <tr key={item.id} className={item.isLowStock ? 'bg-danger-subtle bg-opacity-10' : ''}>
                        <td className="px-3 text-muted x-small">#{item.id}</td>
                        <td className="py-1">
                          <div className="d-flex align-items-center">
                            <div className={`p-1 rounded-1 me-2 d-flex align-items-center justify-content-center border ${item.isLowStock ? 'bg-danger text-white border-danger' : 'bg-light text-primary border-light-subtle'}`} style={{ width: '28px', height: '28px' }}>
                              <i className={`fas ${item.isLowStock ? 'fa-exclamation x-small' : 'fa-box x-small'}`}></i>
                            </div>
                            <div className="lh-sm">
                              <div className="fw-bold text-dark small-font">{item.name}</div>
                              <div className="x-small text-muted text-truncate" style={{ maxWidth: '400px' }}>{item.description || '...'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="x-small fw-medium text-dark bg-light px-2 py-0.5 border rounded">
                            {item.categoryName || '-'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className={`fw-bold small-font ${item.isLowStock ? 'text-danger' : 'text-success'}`}>
                            {item.currentQuantity} <span className="opacity-50 fw-normal">{item.unit}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="x-small text-muted">{item.minQuantity} {item.unit}</span>
                          {item.isLowStock && <div className="text-danger fw-bold x-small">HẾT HÀNG!</div>}
                        </td>
                        <td className="px-3 text-end">
                          <div className="btn-group btn-group-xs shadow-none">
                            <button className="btn btn-outline-success btn-xs px-2" title="Nhập" onClick={() => handleTransaction(item, SparePartTransactionType.In)}>
                              <i className="fas fa-plus"></i>
                            </button>
                            <button className="btn btn-outline-warning btn-xs px-2 text-dark" title="Xuất" onClick={() => handleTransaction(item, SparePartTransactionType.Out)}>
                              <i className="fas fa-minus"></i>
                            </button>
                            <button className="btn btn-outline-primary btn-xs px-2" title="Sửa" onClick={() => handleEdit(item)}>
                              <i className="fas fa-pen"></i>
                            </button>
                            <button className="btn btn-outline-danger btn-xs px-2" title="Xóa" onClick={() => handleDelete(item.id)}>
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
          {response?.total > itemsPerPage && (
            <div className="card-footer bg-white border-top-0 py-2 d-flex justify-content-between align-items-center">
              <div className="x-small text-muted">
                Hiển thị {response.data.length} / {response.total} vật tư
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0 gap-1">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link border-0 bg-light rounded" onClick={() => setPage(page - 1)}>&laquo;</button>
                  </li>
                  {[...Array(Math.ceil(response.total / itemsPerPage))].map((_, i) => (
                    <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                      <button className="page-link border-0 rounded" onClick={() => setPage(i + 1)}>{i + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= Math.ceil(response.total / itemsPerPage) ? 'disabled' : ''}`}>
                    <button className="page-link border-0 bg-light rounded" onClick={() => setPage(page + 1)}>&raquo;</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>

        {/* Modals */}
        <SparePartModal
          show={showModal}
          onClose={() => setShowModal(false)}
          onSave={mutate}
          item={selectedItem}
          categories={categories}
        />

        <SparePartTransactionModal
          show={showTransModal}
          onClose={() => setShowTransModal(false)}
          onSave={mutate}
          item={selectedItem}
          defaultType={transType}
        />
      </div>

      <style jsx>{`
        .small-font { font-size: 0.85rem; }
        .x-small { font-size: 0.75rem; }
        .btn-xs { padding: 0.15rem 0.4rem; font-size: 0.7rem; }
        .table-sm td, .table-sm th { padding: 0.4rem 0.5rem; }
        .custom-dense-table tbody tr { height: 40px; }
        .page-link { min-width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; }
        .page-item.active .page-link { background-color: #2c3e50 !important; }
      `}</style>
    </AdminRoute>
  );
}
