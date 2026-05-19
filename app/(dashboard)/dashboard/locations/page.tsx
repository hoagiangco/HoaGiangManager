'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { Location } from '@/types';
import AdminRoute from '@/components/AdminRoute';

interface DisplayLocation extends Location {
  depth?: number;
}

function LocationsPageContent() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [allLocations, setAllLocations] = useState<DisplayLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState<Partial<Location>>({ id: 0, name: '', parentId: 0 });
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/locations');
      if (response.data.status) {
        setAllLocations(response.data.data || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách vị trí');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...allLocations];
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      
      const matched = allLocations.filter(loc => 
        loc.name?.toLowerCase().includes(keyword)
      );
      
      const idsToShow = new Set<number>();
      
      const addNodeAndAncestors = (loc: Location) => {
        idsToShow.add(loc.id);
        if (loc.parentId) {
          const parent = allLocations.find(l => l.id === loc.parentId);
          if (parent) {
            addNodeAndAncestors(parent);
          }
        }
      };
      
      matched.forEach(loc => addNodeAndAncestors(loc));
      
      filtered = allLocations.filter(loc => idsToShow.has(loc.id));
    }
    setLocations(filtered);
    setCurrentPage(1);
  }, [allLocations, searchKeyword]);

  const handleNew = () => {
    setFormData({ id: 0, name: '', parentId: 0 });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn đúng 1 vị trí để sửa');
      return;
    }
    const selected = allLocations.find(loc => loc.id === selectedIds[0]);
    if (selected) {
      setFormData({ id: selected.id, name: selected.name || '', parentId: selected.parentId || 0 });
      setIsEdit(true);
      setShowModal(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 vị trí để xóa');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa các vị trí đã chọn?')) return;

    try {
      for (const id of selectedIds) {
        const response = await api.delete(`/locations/${id}`);
        if (!response.data.status) {
          toast.error(response.data.error || 'Không thể xóa vị trí đang được sử dụng bởi thiết bị');
          return;
        }
      }
      toast.success('Xóa thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa vị trí');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      toast.error('Vui lòng nhập tên vị trí');
      return;
    }
    try {
      if (isEdit) {
        await api.put(`/locations/${formData.id}`, { name: formData.name.trim(), parentId: formData.parentId || null });
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/locations', { name: formData.name.trim(), parentId: formData.parentId || null });
        toast.success('Thêm mới thành công');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      const msg = error.response?.data?.error;
      toast.error(msg || (isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới'));
    }
  };

  const hierarchicalLocations = useMemo(() => {
    const map = new Map<number, DisplayLocation[]>();
    const roots: DisplayLocation[] = [];

    locations.forEach(loc => {
      if (loc.parentId && locations.some(l => l.id === loc.parentId)) {
        const list = map.get(loc.parentId) || [];
        list.push(loc);
        map.set(loc.parentId, list);
      } else {
        roots.push(loc);
      }
    });

    roots.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const result: DisplayLocation[] = [];
    const traverse = (node: DisplayLocation, depth: number) => {
      result.push({ ...node, depth });
      const children = map.get(node.id) || [];
      children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      children.forEach(child => traverse(child, depth + 1));
    };

    roots.forEach(root => traverse(root, 0));
    return result;
  }, [locations]);

  const sortedLocations = useMemo(() => {
    if (sortField !== 'name' || sortDirection !== 'asc') {
      return [...locations].sort((a, b) => {
        const aVal = a.name || '';
        const bVal = b.name || '';
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }).map(loc => ({ ...loc, depth: 0 }));
    }
    return hierarchicalLocations;
  }, [locations, sortField, sortDirection, hierarchicalLocations]);

  const totalPages = Math.ceil(sortedLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLocations = sortedLocations.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <i className="fas fa-sort text-muted" style={{ fontSize: '0.8rem' }}></i>;
    return sortDirection === 'asc'
      ? <i className="fas fa-sort-up text-primary"></i>
      : <i className="fas fa-sort-down text-primary"></i>;
  };

  const handlePageChange = (page: number) => { setCurrentPage(page); setSelectedIds([]); };
  const handleItemsPerPageChange = (items: number) => { setItemsPerPage(items); setCurrentPage(1); };
  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(currentLocations.map(loc => loc.id));
    else setSelectedIds([]);
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h4 className="mb-0 mb-2 mb-md-0">VỊ TRÍ / KHU VỰC</h4>
            <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-md-none"
                onClick={() => setFiltersOpen(s => !s)}
                aria-pressed={!filtersOpen}
                aria-label={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                title={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              >
                <i className={`fas ${filtersOpen ? 'fa-chevron-up' : 'fa-filter'}`}></i>
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleNew} title="Thêm mới" aria-label="Thêm mới">
                <i className="fas fa-plus"></i>
              </button>
              <button className="btn btn-success btn-sm" onClick={handleEdit} title="Sửa" aria-label="Sửa">
                <i className="fas fa-edit"></i>
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Xóa" aria-label="Xóa">
                <i className="fas fa-trash"></i>
              </button>
              <button className="btn btn-dark btn-sm" onClick={loadData} title="Tải lại" aria-label="Tải lại">
                <i className="fas fa-circle-notch"></i>
              </button>
            </div>
          </div>

          {/* Filter Section */}
          <div className={`card mb-3 filter-card ${filtersOpen ? 'filter-open' : 'filter-collapsed'}`} style={{ backgroundColor: '#f8f9fa' }}>
            <div className="card-body py-2">
              <div className="row g-2">
                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label small">Tìm kiếm</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tên vị trí..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <div className="d-flex align-items-end h-100">
                    <button className="btn btn-secondary btn-sm w-100" onClick={() => setSearchKeyword('')}>
                      <i className="fas fa-filter"></i> Xóa bộ lọc
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
            <div className="d-flex align-items-center gap-1" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
              <span className="d-none d-sm-inline" style={{ whiteSpace: 'nowrap' }}>Hiển thị:</span>
              <span className="d-sm-none" style={{ whiteSpace: 'nowrap' }}>Hiện:</span>
              <select
                className="form-control form-control-sm"
                style={{ width: '60px', padding: '0.25rem 0.5rem' }}
                value={itemsPerPage}
                onChange={e => handleItemsPerPageChange(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="d-none d-sm-inline" style={{ whiteSpace: 'nowrap' }}>dòng/trang</span>
            </div>
            <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.875rem' }}>
                Hiển thị {sortedLocations.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedLocations.length)} của {sortedLocations.length} vị trí
                {searchKeyword.trim() && <span className="text-muted"> (đã lọc)</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="card-body p-0 p-md-3">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === currentLocations.length && currentLocations.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                    <div className="d-flex align-items-center gap-2">
                      <span>Tên vị trí / Khu vực</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th>Trực thuộc</th>
                </tr>
              </thead>
              <tbody>
                {currentLocations.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentLocations.map(location => (
                    <tr key={location.id} style={{ cursor: 'pointer' }} onDoubleClick={() => {
                      setSelectedIds([location.id]);
                      setFormData({ id: location.id, name: location.name });
                      setIsEdit(true);
                      setShowModal(true);
                    }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(location.id)}
                          onChange={() => handleCheckboxChange(location.id)}
                        />
                      </td>
                      <td>
                        <div style={{ paddingLeft: `${(location.depth || 0) * 24}px`, display: 'flex', alignItems: 'center' }}>
                          {location.depth ? (
                            <span className="text-muted me-3" style={{ userSelect: 'none', fontWeight: 'bold' }}>-</span>
                          ) : (
                            <i className="fas fa-map-marker-alt text-primary me-2" style={{ fontSize: '0.85rem' }}></i>
                          )}
                          <span style={{ fontWeight: location.depth ? 'normal' : '600' }}>
                            {location.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        {location.parentName ? (
                          <span className="badge bg-light text-dark border">
                            <i className="fas fa-level-up-alt me-1" style={{ transform: 'rotate(90deg)' }}></i>
                            {location.parentName}
                          </span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Page navigation" className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Trang trước">
                    <i className="fas fa-angle-left"></i>
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(page)}>{page}</button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Trang sau">
                    <i className="fas fa-angle-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                  {isEdit ? 'Cập nhật vị trí' : 'Thêm mới vị trí'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tên vị trí / Khu vực <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Bếp, Sảnh lễ tân, Kho hàng, Phòng họp..."
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  />
                  <div className="form-text">Nhập tên khu vực vật lý nơi thiết bị được đặt.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Trực thuộc vị trí (Tùy chọn)</label>
                  <select 
                    className="form-select"
                    value={formData.parentId || 0}
                    onChange={e => setFormData({ ...formData, parentId: parseInt(e.target.value) })}
                  >
                    <option value={0}>-- Không có --</option>
                    {allLocations
                      .filter(loc => loc.id !== formData.id) // Cannot be child of itself
                      .map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.parentName ? `${loc.parentName} > ${loc.name}` : loc.name}
                        </option>
                      ))
                    }
                  </select>
                  <div className="form-text">Chọn vị trí cha nếu vị trí này nằm bên trong một vị trí lớn hơn (vd: Tủ âm thanh trực thuộc Sảnh A).</div>
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  <i className="fas fa-save me-1"></i>Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationsPage() {
  return (
    <AdminRoute>
      <LocationsPageContent />
    </AdminRoute>
  );
}
