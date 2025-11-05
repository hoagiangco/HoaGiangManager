'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { Department } from '@/types';
import AdminRoute from '@/components/AdminRoute';

function DepartmentsPageContent() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Form state
  const [formData, setFormData] = useState<Partial<Department>>({
    id: 0,
    name: '',
  });
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/departments');
      if (response.data.status) {
        setAllDepartments(response.data.data || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách phòng ban');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...allDepartments];

    // Search by keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(dept =>
        dept.name?.toLowerCase().includes(keyword)
      );
    }

    setDepartments(filtered);
    setCurrentPage(1);
  }, [allDepartments, searchKeyword]);

  const handleNew = () => {
    setFormData({
      id: 0,
      name: '',
    });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn đúng 1 phòng ban để sửa');
      return;
    }

    const selected = allDepartments.find(dept => dept.id === selectedIds[0]);
    if (selected) {
      setFormData({
        id: selected.id,
        name: selected.name || '',
      });
      setIsEdit(true);
      setShowModal(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 phòng ban để xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa các phòng ban đã chọn?')) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const response = await api.delete(`/departments/${id}`);
        if (!response.data.status) {
          toast.error('Không thể xóa phòng ban đang được sử dụng trong nhân viên hoặc thiết bị');
          return;
        }
      }
      toast.success('Xóa thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa phòng ban');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      toast.error('Vui lòng nhập tên phòng ban');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
      };

      if (isEdit) {
        await api.put(`/departments/${formData.id}`, { ...payload, id: formData.id });
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/departments', payload);
        toast.success('Thêm mới thành công');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới');
    }
  };

  // Sort and pagination calculations
  const sortedDepartments = [...departments].sort((a, b) => {
    let aValue: any = a.name || '';
    let bValue: any = b.name || '';

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDepartments = sortedDepartments.slice(startIndex, endIndex);

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
    if (sortField !== field) {
      return <i className="fas fa-sort text-muted" style={{ fontSize: '0.8rem' }}></i>;
    }
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up text-primary"></i>
      : <i className="fas fa-sort-down text-primary"></i>;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentDepartments.map(dept => dept.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle table scroll for visual indicators
  useEffect(() => {
    const tableContainer = document.getElementById('departments-table-responsive');
    const scrollHint = document.querySelector('.table-scroll-hint');
    if (!tableContainer) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainer;
      const hasScrolled = scrollLeft > 0;
      tableContainer.classList.toggle('scrolled', hasScrolled);
      tableContainer.classList.toggle('has-scrolled', hasScrolled);

      if (scrollHint && hasScrolled) {
        (scrollHint as HTMLElement).style.display = 'none';
      }
    };

    handleScroll();
    tableContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      tableContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentDepartments]);

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
            <h4 className="mb-0 mb-2 mb-md-0">PHÒNG BAN</h4>
            <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-md-none"
                onClick={() => setFiltersOpen((s) => !s)}
                aria-pressed={!filtersOpen}
                aria-label={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                title={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              >
                <i className={`fas ${filtersOpen ? 'fa-chevron-up' : 'fa-filter'}`}></i>
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleNew}
                title="Thêm mới"
                aria-label="Thêm mới"
              >
                <i className="fas fa-plus"></i>
              </button>
              <button 
                className="btn btn-success btn-sm" 
                onClick={handleEdit}
                title="Sửa"
                aria-label="Sửa"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button 
                className="btn btn-danger btn-sm" 
                onClick={handleDelete}
                title="Xóa"
                aria-label="Xóa"
              >
                <i className="fas fa-trash"></i>
              </button>
              <button 
                className="btn btn-dark btn-sm" 
                onClick={loadData}
                title="Tải lại"
                aria-label="Tải lại"
              >
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
                    placeholder="Tên phòng ban..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <div className="d-flex align-items-end h-100">
                    <button
                      className="btn btn-secondary btn-sm w-100"
                      onClick={() => setSearchKeyword('')}
                    >
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
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="d-none d-sm-inline" style={{ whiteSpace: 'nowrap' }}>dòng/trang</span>
            </div>
            <div style={{ flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                Hiển thị {sortedDepartments.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedDepartments.length)} của {sortedDepartments.length} phòng ban
                {searchKeyword.trim() && (
                  <span className="text-muted"> (đã lọc)</span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="card-body p-0 p-md-3" style={{ padding: 0 }}>
          <div className="table-scroll-hint d-block d-sm-none text-center text-muted" style={{ fontSize: '0.75rem', padding: '0.25rem 0', marginBottom: '0.5rem' }}>
            ← Cuộn để xem thêm →
          </div>
          <div
            className="table-responsive"
            id="departments-table-responsive"
            style={{
              overflowX: 'auto',
              overflowY: 'visible',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
              width: '100%',
              display: 'block',
              scrollBehavior: 'smooth',
              touchAction: 'pan-x',
              minHeight: '0',
              maxWidth: '100%'
            }}
          >
            <table
              className="table table-striped table-hover mb-0"
              style={{
                tableLayout: 'auto',
                marginBottom: 0,
                display: 'table'
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === currentDepartments.length && currentDepartments.length > 0 && selectedIds.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Tên phòng ban</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentDepartments.map((department) => (
                    <tr key={department.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(department.id)}
                          onChange={() => handleCheckboxChange(department.id)}
                        />
                      </td>
                      <td>{department.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - same as event-types */}
          {totalPages > 1 && (
            <nav aria-label="Page navigation" className="mt-3">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Trang trước"
                    aria-label="Trang trước"
                  >
                    <i className="fas fa-angle-left"></i>
                  </button>
                </li>
                
                {(() => {
                  const pages: number[] = [];
                  
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);
                    let startPage = Math.max(2, currentPage - 1);
                    let endPage = Math.min(totalPages - 1, currentPage + 1);
                    
                    if (currentPage <= 3) {
                      startPage = 2;
                      endPage = 4;
                    }
                    
                    if (currentPage >= totalPages - 2) {
                      startPage = totalPages - 4;
                      endPage = totalPages - 1;
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      if (i > 1 && i < totalPages && !pages.includes(i)) {
                        pages.push(i);
                      }
                    }
                    
                    if (!pages.includes(totalPages)) {
                      pages.push(totalPages);
                    }
                  }
                  
                  const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);
                  
                  return uniquePages.map((page, index) => {
                    const prevPage = index > 0 ? uniquePages[index - 1] : 0;
                    const showEllipsisBefore = prevPage > 0 && page - prevPage > 1;
                    
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      </React.Fragment>
                    );
                  });
                })()}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Trang sau"
                    aria-label="Trang sau"
                  >
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
                <h5 className="modal-title">{isEdit ? 'Cập nhật phòng ban' : 'Thêm mới phòng ban'}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tên phòng ban <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên phòng ban"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <AdminRoute>
      <DepartmentsPageContent />
    </AdminRoute>
  );
}

