'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { StaffVM, Department } from '@/types';
import { formatDateDisplay, formatDateInput } from '@/lib/utils/dateFormat';
import DateInput from '@/components/DateInput';
import AdminRoute from '@/components/AdminRoute';
import Loading from '@/components/Loading';

function StaffPageContent() {
  // Control mobile filter visibility
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [staff, setStaff] = useState<StaffVM[]>([]);
  const [allStaff, setAllStaff] = useState<StaffVM[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(0);
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
  const [formData, setFormData] = useState<Partial<StaffVM>>({
    id: 0,
    name: '',
    email: '',
    gender: undefined,
    birthday: undefined,
    departmentId: undefined,
  });
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    loadData();
    loadDepartments();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff?departmentId=0');
      if (response.data.status) {
        setAllStaff(response.data.data || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      if (response.data.status) {
        setDepartments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...allStaff];

    // Filter by department
    if (selectedDepartment > 0) {
      filtered = filtered.filter(s => s.departmentId === selectedDepartment);
    }

    // Search by keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(keyword) ||
        s.departmentName?.toLowerCase().includes(keyword)
      );
    }

    setStaff(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [allStaff, selectedDepartment, searchKeyword]);

  const handleNew = () => {
    setFormData({
      id: 0,
      name: '',
      email: '',
      gender: undefined,
      birthday: undefined,
      departmentId: undefined,
    });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn đúng 1 nhân viên để sửa');
      return;
    }

    const selectedStaff = allStaff.find(s => s.id === selectedIds[0]);
    if (selectedStaff) {
      setFormData({
        id: selectedStaff.id,
        name: selectedStaff.name || '',
        email: selectedStaff.email || '',
        gender: selectedStaff.gender,
        birthday: selectedStaff.birthday,
        departmentId: selectedStaff.departmentId,
      });
      setIsEdit(true);
      setShowModal(true);
    }
  };

  const handleCheckNameSync = async () => {
    try {
      const response = await api.get('/staff/sync-names');
      if (response.data.status) {
        const mismatches = response.data.data || [];
        if (mismatches.length === 0) {
          toast.success('Tất cả tên nhân viên đã được đồng bộ với tài khoản');
        } else {
          const message = `Tìm thấy ${mismatches.length} nhân viên có tên khác nhau:\n${mismatches.map((m: any) => `- ${m.staffName} (Staff) vs ${m.userName || '(trống)'} (User)`).join('\n')}\n\nBạn có muốn đồng bộ không?`;
          if (confirm(message)) {
            const syncResponse = await api.post('/staff/sync-names');
            if (syncResponse.data.status) {
              toast.success(syncResponse.data.message || 'Đồng bộ thành công');
              loadData();
            } else {
              toast.error(syncResponse.data.error || 'Lỗi khi đồng bộ');
            }
          }
        }
      } else {
        toast.error(response.data.error || 'Lỗi khi kiểm tra');
      }
    } catch (error: any) {
      toast.error('Lỗi khi kiểm tra đồng bộ tên');
      console.error('Check name sync error:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 nhân viên để xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa các nhân viên đã chọn?')) {
      return;
    }

    try {
      let deletedCount = 0;
      for (const id of selectedIds) {
        let response = await api.delete(`/staff/${id}`);

        if (!response.data.status && response.data.requiresConfirmation) {
          let warningMessage = response.data.message || 'Nhân viên này đã được sử dụng, nếu xóa sẽ làm ảnh hưởng đến dữ liệu.';
          const usageDetails = formatUsageDetails(response.data.usage);
          if (usageDetails) {
            warningMessage += `\n\nẢnh hưởng:\n${usageDetails}`;
          }
          warningMessage += '\n\nBạn có chắc chắn muốn tiếp tục?';

          if (!confirm(warningMessage)) {
            continue;
          }

          response = await api.delete(`/staff/${id}?force=true`);
        }

        if (!response.data.status) {
          toast.error(response.data.message || response.data.error || 'Không thể xóa nhân viên');
          return;
        }

        deletedCount++;
      }
      if (deletedCount > 0) {
        toast.success(`Đã xóa ${deletedCount} nhân viên thành công`);
        setSelectedIds([]);
        loadData();
      } else {
        toast.info('Không có nhân viên nào được xóa');
      }
    } catch (error: any) {
      toast.error('Lỗi khi xóa nhân viên');
      console.error('Delete error:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      toast.error('Vui lòng nhập tên nhân viên');
      return;
    }

    // Email is required when creating new staff or when staff doesn't have userId yet
    if (!isEdit && (!formData.email || !formData.email.trim())) {
      toast.error('Vui lòng nhập email để tạo tài khoản');
      return;
    }

    // If editing and staff doesn't have userId, email is required
    if (isEdit && !formData.userId && (!formData.email || !formData.email.trim())) {
      toast.error('Vui lòng nhập email để tạo tài khoản cho nhân viên này');
      return;
    }

    // Validate email format
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('Email không hợp lệ');
        return;
      }
    }

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        gender: formData.gender !== undefined ? formData.gender : null,
        birthday: formData.birthday || null,
        departmentId: formData.departmentId || null,
      };

      if (isEdit) {
        await api.put(`/staff/${formData.id}`, { ...payload, id: formData.id });
        toast.success('Cập nhật thành công');
      } else {
        const response = await api.post('/staff', payload);
        if (response.data.message) {
          toast.success(response.data.message);
        } else {
          toast.success('Thêm mới thành công');
        }
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới');
      console.error('Save error:', error);
    }
  };

  // Sort and pagination calculations
  const sortedStaff = [...staff].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'gender':
        aValue = a.gender === true ? 1 : a.gender === false ? 0 : -1;
        bValue = b.gender === true ? 1 : b.gender === false ? 0 : -1;
        break;
      case 'birthday':
        aValue = a.birthday ? new Date(a.birthday).getTime() : 0;
        bValue = b.birthday ? new Date(b.birthday).getTime() : 0;
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'department':
        aValue = a.departmentName || '';
        bValue = b.departmentName || '';
        break;
      default:
        aValue = a.name || '';
        bValue = b.name || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStaff = sortedStaff.slice(startIndex, endIndex);

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

  const getSortFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      name: 'Tên nhân viên',
      gender: 'Giới tính',
      birthday: 'Ngày sinh',
      email: 'Email',
      department: 'Phòng ban',
    };
    return labels[field] || field;
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
      setSelectedIds(currentStaff.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const getGenderLabel = (gender?: boolean) => {
    if (gender === true) return 'Nam';
    if (gender === false) return 'Nữ';
    return 'Chưa xác định';
  };

  const getGenderBadge = (gender?: boolean) => {
    if (gender === true) return <span className="badge bg-info">Nam</span>;
    if (gender === false) return <span className="badge bg-pink">Nữ</span>;
    return <span className="badge bg-secondary">Chưa xác định</span>;
  };

  const formatUsageDetails = (usage: any) => {
    if (!usage) return '';
    const parts: string[] = [];
    if (usage.damageReportsHandled) parts.push(`- ${usage.damageReportsHandled} báo cáo đang xử lý`);
    if (usage.damageReportsReported) parts.push(`- ${usage.damageReportsReported} báo cáo đã báo cáo`);
    if (usage.events) parts.push(`- ${usage.events} sự kiện`);
    if (usage.reportsCreatedBy) parts.push(`- ${usage.reportsCreatedBy} báo cáo được tạo bởi tài khoản này`);
    if (usage.reportsUpdatedBy) parts.push(`- ${usage.reportsUpdatedBy} báo cáo được cập nhật bởi tài khoản này`);
    if (usage.historyChanges) parts.push(`- ${usage.historyChanges} lịch sử thay đổi`);
    return parts.join('\n');
  };

  // Handle table scroll for visual indicators
  useEffect(() => {
    const tableContainer = document.getElementById('staff-table-responsive');
    const scrollHint = document.querySelector('.table-scroll-hint');
    if (!tableContainer) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainer;
      const isAtStart = scrollLeft === 0;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;
      const hasScrolled = scrollLeft > 0;

      // Update classes for visual indicators
      tableContainer.classList.toggle('scrolled', hasScrolled);
      tableContainer.classList.toggle('scrolled-to-end', isAtEnd);
      tableContainer.classList.toggle('has-scrolled', hasScrolled);

      // Hide scroll hint after first scroll
      if (scrollHint && hasScrolled) {
        (scrollHint as HTMLElement).style.display = 'none';
      }
    };

    // Check initial state
    handleScroll();

    tableContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      tableContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentStaff]); // Re-run when table content changes

  if (loading) {
    return <Loading fullPage />;
  }

  return (
    <div className="container-fluid" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h4 className="mb-0 mb-2 mb-md-0">NHÂN VIÊN</h4>
            <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
              {/* Mobile-only filter toggle */}
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
              <button 
                className="btn btn-info btn-sm" 
                onClick={handleCheckNameSync}
                title="Kiểm tra đồng bộ tên"
                aria-label="Kiểm tra đồng bộ tên"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          {/* Filter Section */}
          <div className={`card mb-3 filter-card ${filtersOpen ? 'filter-open' : 'filter-collapsed'}`} style={{ backgroundColor: '#f8f9fa' }}>
            <div className="card-body py-2">
              <div className="row g-2">
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label small">Tìm kiếm</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tên, phòng ban..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label small">Phòng ban</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(Number(e.target.value))}
                  >
                    <option value="0">Tất cả</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <div className="d-flex align-items-end h-100">
                    <button
                      className="btn btn-secondary btn-sm w-100"
                      onClick={() => {
                        setSearchKeyword('');
                        setSelectedDepartment(0);
                      }}
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
                Hiển thị {sortedStaff.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedStaff.length)} của {sortedStaff.length} nhân viên
                {(selectedDepartment > 0 || searchKeyword.trim()) && (
                  <span className="text-muted"> (đã lọc)</span>
                )}
                {sortField && (
                  <span className="text-muted ms-2 d-none d-lg-inline">
                    <i className="fas fa-sort"></i> Sắp xếp: {getSortFieldLabel(sortField)} ({sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="card-body p-0 p-md-3" style={{ padding: 0 }}>
          {/* Scroll hint for mobile */}
          <div className="table-scroll-hint d-block d-sm-none text-center text-muted" style={{ fontSize: '0.75rem', padding: '0.25rem 0', marginBottom: '0.5rem' }}>
            ← Cuộn để xem thêm →
          </div>
          <div
            className="table-responsive"
            id="staff-table-responsive"
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
                      checked={selectedIds.length === currentStaff.length && currentStaff.length > 0 && selectedIds.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Tên nhân viên</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('gender')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Giới tính</span>
                      {getSortIcon('gender')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('birthday')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Ngày sinh</span>
                      {getSortIcon('birthday')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('email')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Email</span>
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('department')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Phòng ban</span>
                      {getSortIcon('department')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentStaff.map((staffMember) => (
                    <tr key={staffMember.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(staffMember.id)}
                          onChange={() => handleCheckboxChange(staffMember.id)}
                        />
                      </td>
                      <td>{staffMember.name}</td>
                      <td>{getGenderBadge(staffMember.gender)}</td>
                      <td>
                        {staffMember.birthday 
                          ? formatDateDisplay(staffMember.birthday)
                          : <span className="text-muted">-</span>
                        }
                      </td>
                      <td>{staffMember.email || <span className="text-muted">-</span>}</td>
                      <td>{staffMember.departmentName || <span className="text-muted">-</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                
                {/* Page numbers */}
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isEdit ? 'Cập nhật nhân viên' : 'Thêm mới nhân viên'}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tên nhân viên <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên nhân viên"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@company.com"
                    required
                  />
                  {isEdit && (
                    <small className="form-text text-muted d-block mt-1">
                      Cập nhật email này sẽ đồng bộ email đăng nhập của tài khoản nhân viên.
                    </small>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Giới tính</label>
                  <select
                    className="form-control"
                    value={formData.gender === undefined ? '' : formData.gender ? 'true' : 'false'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      gender: e.target.value === '' ? undefined : e.target.value === 'true'
                    })}
                  >
                    <option value="">Chưa xác định</option>
                    <option value="true">Nam</option>
                    <option value="false">Nữ</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Ngày sinh</label>
                  <DateInput
                    value={formData.birthday}
                    onChange={(value) => setFormData({ 
                      ...formData, 
                      birthday: value ? new Date(value) : undefined
                    })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Phòng ban</label>
                  <select
                    className="form-control"
                    value={formData.departmentId || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      departmentId: e.target.value ? Number(e.target.value) : undefined
                    })}
                  >
                    <option value="">Chọn phòng ban</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
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

export default function StaffPage() {
  return (
    <AdminRoute>
      <StaffPageContent />
    </AdminRoute>
  );
}

