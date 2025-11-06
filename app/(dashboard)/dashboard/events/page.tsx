'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { EventVM, EventType } from '@/types';
import { format } from 'date-fns';
import AdminRoute from '@/components/AdminRoute';

function EventsPageContent() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [events, setEvents] = useState<EventVM[]>([]);
  const [allEvents, setAllEvents] = useState<EventVM[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Form state
  const [formData, setFormData] = useState<Partial<EventVM>>({
    id: 0,
    name: '',
    deviceId: undefined,
    eventTypeId: undefined,
    description: '',
    img: '',
    startDate: undefined,
    finishDate: new Date(),
    staffId: undefined,
    notes: '',
    newDeviceStatus: undefined,
  });
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    loadData();
    loadEventTypes();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events?eventTypeId=${selectedEventType}`);
      if (response.data.status) {
        setAllEvents(response.data.data || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  const loadEventTypes = async () => {
    try {
      const response = await api.get('/event-types');
      if (response.data.status) {
        setEventTypes(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading event types:', error);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...allEvents];

    // Filter by event type
    if (selectedEventType > 0) {
      filtered = filtered.filter(e => e.eventTypeId === selectedEventType);
    }

    // Search by keyword
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(keyword) ||
        e.description?.toLowerCase().includes(keyword) ||
        e.deviceName?.toLowerCase().includes(keyword) ||
        e.eventTypeName?.toLowerCase().includes(keyword) ||
        e.staffName?.toLowerCase().includes(keyword)
      );
    }

    setEvents(filtered);
    setCurrentPage(1);
  }, [allEvents, selectedEventType, searchKeyword]);

  useEffect(() => {
    loadData();
  }, [selectedEventType]);

  const handleNew = () => {
    setFormData({
      id: 0,
      name: '',
      deviceId: undefined,
      eventTypeId: undefined,
      description: '',
      img: '',
      startDate: undefined,
      finishDate: new Date(),
      staffId: undefined,
      notes: '',
      newDeviceStatus: undefined,
    });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn đúng 1 sự kiện để sửa');
      return;
    }

    const selected = allEvents.find(e => e.id === selectedIds[0]);
    if (selected) {
      setFormData({
        id: selected.id,
        name: selected.name || '',
        deviceId: selected.deviceId,
        eventTypeId: selected.eventTypeId,
        description: selected.description || '',
        img: selected.img || '',
        startDate: selected.startDate ? new Date(selected.startDate) : undefined,
        finishDate: selected.finishDate ? new Date(selected.finishDate) : new Date(),
        staffId: selected.staffId,
        notes: selected.notes || '',
        newDeviceStatus: selected.newDeviceStatus,
      });
      setIsEdit(true);
      setShowModal(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 sự kiện để xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa các sự kiện đã chọn?')) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const response = await api.delete(`/events/${id}`);
        if (!response.data.status) {
          toast.error(response.data.message || 'Không thể xóa sự kiện');
          return;
        }
      }
      toast.success('Xóa thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa sự kiện');
    }
  };

  const handleSave = async () => {
    if (!formData.description || !formData.description.trim()) {
      toast.error('Vui lòng nhập mô tả');
      return;
    }

    try {
      const payload: any = {
        name: formData.name?.trim() || '',
        deviceId: formData.deviceId || null,
        eventTypeId: formData.eventTypeId || null,
        description: formData.description.trim(),
        img: formData.img || '',
        startDate: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : null,
        finishDate: formData.finishDate ? format(formData.finishDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        staffId: formData.staffId || null,
        notes: formData.notes || '',
        newDeviceStatus: formData.newDeviceStatus || null,
      };

      if (isEdit) {
        await api.put(`/events/${formData.id}`, { ...payload, id: formData.id });
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/events', payload);
        toast.success('Thêm mới thành công');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới');
    }
  };

  // Sort and pagination calculations
  const sortedEvents = [...events].sort((a, b) => {
    let aValue: any = a[sortField as keyof EventVM];
    let bValue: any = b[sortField as keyof EventVM];

    if (sortField === 'startDate' || sortField === 'finishDate') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    } else {
      aValue = aValue || '';
      bValue = bValue || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvents = sortedEvents.slice(startIndex, endIndex);

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
      setSelectedIds(currentEvents.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
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
            <h4 className="mb-0 mb-2 mb-md-0">SỰ KIỆN</h4>
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
                  <label className="form-label small">Loại sự kiện</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(Number(e.target.value))}
                  >
                    <option value="0">Tất cả</option>
                    {eventTypes.map(et => (
                      <option key={et.id} value={et.id}>{et.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <label className="form-label small">Tìm kiếm</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tên, mô tả, thiết bị..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <div className="d-flex align-items-end h-100">
                    <button
                      className="btn btn-secondary btn-sm w-100"
                      onClick={() => {
                        setSearchKeyword('');
                        setSelectedEventType(0);
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
                Hiển thị {sortedEvents.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedEvents.length)} của {sortedEvents.length} sự kiện
                {(searchKeyword.trim() || selectedEventType > 0) && (
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
            id="events-table-responsive"
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
                      checked={selectedIds.length === currentEvents.length && currentEvents.length > 0 && selectedIds.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Tên</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('deviceName')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Thiết bị</span>
                      {getSortIcon('deviceName')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('eventTypeName')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Loại</span>
                      {getSortIcon('eventTypeName')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('startDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Ngày bắt đầu</span>
                      {getSortIcon('startDate')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('finishDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Ngày kết thúc</span>
                      {getSortIcon('finishDate')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('staffName')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Nhân viên</span>
                      {getSortIcon('staffName')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(event.id)}
                          onChange={() => handleCheckboxChange(event.id)}
                        />
                      </td>
                      <td>{event.name || '-'}</td>
                      <td>{event.deviceName || '-'}</td>
                      <td>{event.eventTypeName || '-'}</td>
                      <td>{event.startDate ? format(new Date(event.startDate), 'dd/MM/yyyy') : '-'}</td>
                      <td>{event.finishDate ? format(new Date(event.finishDate), 'dd/MM/yyyy') : '-'}</td>
                      <td>{event.staffName || '-'}</td>
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
                <h5 className="modal-title">{isEdit ? 'Cập nhật sự kiện' : 'Thêm mới sự kiện'}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Tên sự kiện</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nhập tên sự kiện"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Loại sự kiện</label>
                    <select
                      className="form-control"
                      value={formData.eventTypeId || ''}
                      onChange={(e) => setFormData({ ...formData, eventTypeId: e.target.value ? Number(e.target.value) : undefined })}
                    >
                      <option value="">Chọn loại sự kiện</option>
                      {eventTypes.map(et => (
                        <option key={et.id} value={et.id}>{et.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Mô tả <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Nhập mô tả"
                    required
                  />
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Ngày bắt đầu</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.startDate ? format(new Date(formData.startDate), 'yyyy-MM-dd') : ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Ngày kết thúc <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.finishDate ? format(new Date(formData.finishDate), 'yyyy-MM-dd') : ''}
                      onChange={(e) => setFormData({ ...formData, finishDate: e.target.value ? new Date(e.target.value) : new Date() })}
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Nhập ghi chú"
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

export default function EventsPage() {
  return (
    <AdminRoute>
      <EventsPageContent />
    </AdminRoute>
  );
}
