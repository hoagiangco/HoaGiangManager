'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { EventStatus, EventType, EventVM } from '@/types';
import { format } from 'date-fns';
import AdminRoute from '@/components/AdminRoute';

type EventFormState = {
  id?: number;
  title: string;
  eventTypeId?: number;
  status: EventStatus;
  description: string;
  notes: string;
  eventDate: string;
  startDate: string;
  endDate: string;
  deviceId: string;
  staffId: string;
  relatedReportId: string;
};

const STATUS_OPTIONS: Array<{ value: EventStatus; label: string }> = [
  { value: EventStatus.Planned, label: 'Kế hoạch' },
  { value: EventStatus.InProgress, label: 'Đang thực hiện' },
  { value: EventStatus.Completed, label: 'Đã hoàn thành' },
  { value: EventStatus.Cancelled, label: 'Đã hủy' },
  { value: EventStatus.Missed, label: 'Trễ lịch' },
];

const STATUS_LABELS: Record<EventStatus, string> = {
  [EventStatus.Planned]: 'Kế hoạch',
  [EventStatus.InProgress]: 'Đang thực hiện',
  [EventStatus.Completed]: 'Đã hoàn thành',
  [EventStatus.Cancelled]: 'Đã hủy',
  [EventStatus.Missed]: 'Trễ lịch',
};

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  [EventStatus.Planned]: 'badge bg-secondary',
  [EventStatus.InProgress]: 'badge bg-info text-dark',
  [EventStatus.Completed]: 'badge bg-success',
  [EventStatus.Cancelled]: 'badge bg-danger',
  [EventStatus.Missed]: 'badge bg-warning text-dark',
};

const STATUS_SORT_ORDER: Record<EventStatus, number> = {
  [EventStatus.Planned]: 1,
  [EventStatus.InProgress]: 2,
  [EventStatus.Completed]: 3,
  [EventStatus.Missed]: 4,
  [EventStatus.Cancelled]: 5,
};

const createDefaultFormState = (): EventFormState => ({
  title: '',
  eventTypeId: undefined,
  status: EventStatus.Planned,
  description: '',
  notes: '',
  eventDate: '',
  startDate: '',
  endDate: '',
  deviceId: '',
  staffId: '',
  relatedReportId: '',
});

const formatDateForInput = (value?: string | Date | null): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return format(date, 'yyyy-MM-dd');
};

const formatDateForDisplay = (value?: string | Date | null): string => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'dd/MM/yyyy');
};

const getStatusLabel = (status: EventStatus | undefined | null): string => {
  if (!status) {
    return STATUS_LABELS[EventStatus.Planned];
  }
  return STATUS_LABELS[status] ?? status;
};

function EventsPageContent() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [allEvents, setAllEvents] = useState<EventVM[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>('eventDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [formData, setFormData] = useState<EventFormState>(() => createDefaultFormState());
  const [metadataInput, setMetadataInput] = useState('');
  const [isEdit, setIsEdit] = useState(false);

  const loadData = async (eventTypeId: number = selectedEventType) => {
    try {
      setLoading(true);
      const response = await api.get(`/events?eventTypeId=${eventTypeId}`);
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

  useEffect(() => {
    loadEventTypes();
  }, []);

  useEffect(() => {
    loadData(selectedEventType);
  }, [selectedEventType]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchKeyword, statusFilter, selectedEventType, itemsPerPage]);

  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];

    if (selectedEventType > 0) {
      filtered = filtered.filter((event) => event.eventTypeId === selectedEventType);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (event) => (event.status || EventStatus.Planned) === statusFilter
      );
    }

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter((event) => {
        const values: Array<string | undefined | null> = [
          event.title,
          event.description,
          event.notes,
          event.deviceName,
          event.eventTypeName,
          event.staffName,
          event.relatedReportSummary,
          getStatusLabel(event.status),
        ];
        return values.some((value) =>
          value ? value.toLowerCase().includes(keyword) : false
        );
      });
    }

    return filtered;
  }, [allEvents, selectedEventType, statusFilter, searchKeyword]);

  const sortedEvents = useMemo(() => {
    const eventsToSort = [...filteredEvents];
    const resolveTimestamp = (value?: string | Date | null) => {
      if (!value) return 0;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    eventsToSort.sort((a, b) => {
      let aValue: number | string = '';
      let bValue: number | string = '';

      switch (sortField) {
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'deviceName':
          aValue = (a.deviceName || '').toLowerCase();
          bValue = (b.deviceName || '').toLowerCase();
          break;
        case 'eventTypeName':
          aValue = (a.eventTypeName || '').toLowerCase();
          bValue = (b.eventTypeName || '').toLowerCase();
          break;
        case 'status':
          aValue = STATUS_SORT_ORDER[a.status || EventStatus.Planned];
          bValue = STATUS_SORT_ORDER[b.status || EventStatus.Planned];
          break;
        case 'eventDate':
          aValue = resolveTimestamp(a.eventDate);
          bValue = resolveTimestamp(b.eventDate);
          break;
        case 'startDate':
          aValue = resolveTimestamp(a.startDate);
          bValue = resolveTimestamp(b.startDate);
          break;
        case 'endDate':
          aValue = resolveTimestamp(a.endDate);
          bValue = resolveTimestamp(b.endDate);
          break;
        case 'staffName':
          aValue = (a.staffName || '').toLowerCase();
          bValue = (b.staffName || '').toLowerCase();
          break;
        case 'relatedReportId':
          aValue = a.relatedReportId || 0;
          bValue = b.relatedReportId || 0;
          break;
        default:
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return eventsToSort;
  }, [filteredEvents, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedEvents.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvents = sortedEvents.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage !== currentPageSafe) {
      setCurrentPage(currentPageSafe);
    }
  }, [currentPage, currentPageSafe]);

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
      return <i className="fas fa-sort text-muted" style={{ fontSize: '0.8rem' }} />;
    }
    return sortDirection === 'asc'
      ? <i className="fas fa-sort-up text-primary" />
      : <i className="fas fa-sort-down text-primary" />;
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
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentEvents.map((event) => event.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setIsEdit(false);
    setFormData(createDefaultFormState());
    setMetadataInput('');
  };

  const handleNew = () => {
    setFormData(createDefaultFormState());
    setMetadataInput('');
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn đúng 1 sự kiện để sửa');
      return;
    }

    const selected = filteredEvents.find((event) => event.id === selectedIds[0]);
    if (selected) {
      setFormData({
        id: selected.id,
        title: selected.title || '',
        eventTypeId: selected.eventTypeId,
        status: selected.status || EventStatus.Planned,
        description: selected.description || '',
        notes: selected.notes || '',
        eventDate: formatDateForInput(selected.eventDate),
        startDate: formatDateForInput(selected.startDate),
        endDate: formatDateForInput(selected.endDate),
        deviceId: selected.deviceId ? String(selected.deviceId) : '',
        staffId: selected.staffId ? String(selected.staffId) : '',
        relatedReportId: selected.relatedReportId ? String(selected.relatedReportId) : '',
      });
      setMetadataInput(selected.metadata ? JSON.stringify(selected.metadata, null, 2) : '');
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
      toast.success('Xóa sự kiện thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa sự kiện');
    }
  };

  const handleSave = async () => {
    if (!formData.eventTypeId) {
      toast.error('Vui lòng chọn loại sự kiện');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Vui lòng nhập mô tả sự kiện');
      return;
    }

    let metadata: Record<string, any> | null = null;
    if (metadataInput.trim()) {
      try {
        metadata = JSON.parse(metadataInput);
      } catch (error) {
        toast.error('Metadata phải là JSON hợp lệ');
        return;
      }
    }

    const payload = {
      title: formData.title.trim() || null,
      eventTypeId: formData.eventTypeId,
      status: formData.status || EventStatus.Planned,
      description: formData.description.trim() || null,
      notes: formData.notes.trim() || null,
      eventDate: formData.eventDate || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      deviceId: formData.deviceId ? Number(formData.deviceId) : null,
      staffId: formData.staffId ? Number(formData.staffId) : null,
      relatedReportId: formData.relatedReportId ? Number(formData.relatedReportId) : null,
      metadata,
    };

    try {
      if (isEdit && formData.id) {
        await api.put(`/events/${formData.id}`, payload);
        toast.success('Cập nhật sự kiện thành công');
      } else {
        await api.post('/events', payload);
        toast.success('Thêm sự kiện thành công');
      }

      handleModalClose();
      loadData();
    } catch (error) {
      toast.error(isEdit ? 'Lỗi khi cập nhật sự kiện' : 'Lỗi khi tạo sự kiện');
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleEventTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const selectedTypeId = value ? Number(value) : undefined;
    const defaultStatus = eventTypes.find((type) => type.id === selectedTypeId)?.defaultStatus;

    setFormData((prev) => ({
      ...prev,
      eventTypeId: selectedTypeId,
      status: defaultStatus || prev.status || EventStatus.Planned,
    }));
  };

  const renderDateColumn = (event: EventVM) => {
    if (event.eventDate) {
      return formatDateForDisplay(event.eventDate);
    }
    if (event.startDate || event.endDate) {
      const start = formatDateForDisplay(event.startDate);
      const end = formatDateForDisplay(event.endDate);
      if (start === end) {
        return start;
      }
      return `${start} → ${end}`;
    }
    return '-';
  };

  const renderRelatedReport = (event: EventVM) => {
    if (!event.relatedReportId) {
      return '-';
    }
    return `#${event.relatedReportId}${event.relatedReportSummary ? ` • ${event.relatedReportSummary}` : ''}`;
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
    <div className="container-fluid" style={{ margin: 0, padding: 0 }}>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h4 className="mb-0 mb-2 mb-md-0">SỰ KIỆN THIẾT BỊ</h4>
            <div className="d-flex gap-1 align-items-center flex-nowrap">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-md-none"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-label={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                title={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              >
                <i className={`fas ${filtersOpen ? 'fa-chevron-up' : 'fa-filter'}`} />
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleNew} title="Thêm sự kiện">
                <i className="fas fa-plus" />
              </button>
              <button className="btn btn-success btn-sm" onClick={handleEdit} title="Sửa sự kiện">
                <i className="fas fa-edit" />
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Xóa sự kiện">
                <i className="fas fa-trash" />
              </button>
              <button className="btn btn-dark btn-sm" onClick={handleRefresh} title="Tải lại">
                <i className="fas fa-rotate" />
              </button>
            </div>
          </div>

          <div
            className={`card mb-3 filter-card ${filtersOpen ? 'filter-open' : 'filter-collapsed'}`}
            style={{ backgroundColor: '#f8f9fa' }}
          >
            <div className="card-body py-2">
              <div className="row g-2">
                <div className="col-12 col-md-4">
                  <label className="form-label small">Loại sự kiện</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(Number(e.target.value))}
                  >
                    <option value={0}>Tất cả</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.code ? `${type.code} — ${type.name}` : type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small">Trạng thái</label>
                  <select
                    className="form-control form-control-sm"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value === 'all' ? 'all' : (e.target.value as EventStatus)
                      )
                    }
                  >
                    <option value="all">Tất cả</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small">Tìm kiếm nhanh</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Tên sự kiện, loại, thiết bị, ghi chú..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSearchKeyword('');
                      setSelectedEventType(0);
                      setStatusFilter('all');
                    }}
                  >
                    <i className="fas fa-eraser me-1" /> Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-1">
              <span className="d-none d-sm-inline" style={{ whiteSpace: 'nowrap' }}>
                Hiển thị:
              </span>
              <span className="d-sm-none" style={{ whiteSpace: 'nowrap' }}>
                Hiện:
              </span>
              <select
                className="form-control form-control-sm"
                style={{ width: '72px' }}
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="d-none d-sm-inline" style={{ whiteSpace: 'nowrap' }}>
                dòng/trang
              </span>
            </div>
            <div style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
              {sortedEvents.length === 0
                ? 'Không có sự kiện'
                : `Hiển thị ${startIndex + 1}-${Math.min(endIndex, sortedEvents.length)} / ${
                    sortedEvents.length
                  } sự kiện${searchKeyword || statusFilter !== 'all' || selectedEventType
                    ? ' (đã lọc)'
                    : ''}`}
            </div>
          </div>
        </div>

        <div className="card-body p-0 p-md-3">
          <div
            className="table-responsive"
            style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <table className="table table-striped table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={
                        currentEvents.length > 0 &&
                        selectedIds.length === currentEvents.length &&
                        selectedIds.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '220px' }}
                    onClick={() => handleSort('title')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Tiêu đề</span>
                      {getSortIcon('title')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '160px' }}
                    onClick={() => handleSort('eventTypeName')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Loại</span>
                      {getSortIcon('eventTypeName')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '120px' }}
                    onClick={() => handleSort('status')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Trạng thái</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '160px' }}
                    onClick={() => handleSort('deviceName')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Thiết bị</span>
                      {getSortIcon('deviceName')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '160px' }}
                    onClick={() => handleSort('eventDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Mốc thời gian</span>
                      {getSortIcon('eventDate')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '140px' }}
                    onClick={() => handleSort('staffName')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Phụ trách</span>
                      {getSortIcon('staffName')}
                    </div>
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '200px' }}
                    onClick={() => handleSort('relatedReportId')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Báo cáo liên quan</span>
                      {getSortIcon('relatedReportId')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      Không có dữ liệu
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
                      <td>
                        <div className="fw-semibold">
                          {event.title?.trim()
                            ? event.title
                            : event.description?.slice(0, 80) || '(Không có tiêu đề)'}
                        </div>
                        {event.description && (
                          <div className="text-muted small">
                            {event.description.length > 120
                              ? `${event.description.slice(0, 120)}…`
                              : event.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold">{event.eventTypeName || '-'}</span>
                          {event.eventTypeCode && (
                            <span className="small text-muted">{event.eventTypeCode}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={STATUS_BADGE_CLASS[event.status || EventStatus.Planned]}>
                          {getStatusLabel(event.status)}
                        </span>
                      </td>
                      <td>{event.deviceName || '-'}</td>
                      <td>{renderDateColumn(event)}</td>
                      <td>{event.staffName || '-'}</td>
                      <td>{renderRelatedReport(event)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Page navigation" className="mt-3">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${currentPageSafe === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPageSafe - 1)}
                    disabled={currentPageSafe === 1}
                  >
                    <i className="fas fa-angle-left" />
                  </button>
                </li>
                {(() => {
                  const pages: number[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    const addPage = (page: number) => {
                      if (!pages.includes(page)) {
                        pages.push(page);
                      }
                    };
                    addPage(1);
                    const neighbours = [currentPageSafe - 1, currentPageSafe, currentPageSafe + 1];
                    neighbours.forEach((page) => {
                      if (page > 1 && page < totalPages) {
                        addPage(page);
                      }
                    });
                    addPage(totalPages);
                  }
                  const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);
                  return uniquePages.map((page, index) => {
                    const prev = uniquePages[index - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <li className="page-item disabled">
                            <span className="page-link">…</span>
                          </li>
                        )}
                        <li className={`page-item ${currentPageSafe === page ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(page)}>
                            {page}
                          </button>
                        </li>
                      </React.Fragment>
                    );
                  });
                })()}
                <li className={`page-item ${currentPageSafe === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPageSafe + 1)}
                    disabled={currentPageSafe === totalPages}
                  >
                    <i className="fas fa-angle-right" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isEdit ? 'Cập nhật sự kiện' : 'Thêm sự kiện'}</h5>
                <button type="button" className="btn-close" onClick={handleModalClose} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Tiêu đề</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Ví dụ: Bảo trì định kỳ lần 2"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Loại sự kiện <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formData.eventTypeId ?? ''}
                      onChange={handleEventTypeChange}
                    >
                      <option value="">-- Chọn loại sự kiện --</option>
                      {eventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.code ? `${type.code} — ${type.name}` : type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Trạng thái <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as EventStatus,
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Thiết bị (ID)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.deviceId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, deviceId: e.target.value }))
                      }
                      placeholder="Nhập ID thiết bị"
                      min={0}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      Mô tả chi tiết <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Ghi lại nội dung sự kiện, tình trạng, kết quả..."
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Ghi chú bổ sung</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ngày diễn ra</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.eventDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, eventDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ngày bắt đầu</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ngày kết thúc</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Người phụ trách (ID nhân viên)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.staffId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, staffId: e.target.value }))
                      }
                      placeholder="Nhập ID nhân viên"
                      min={0}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Báo cáo hư hỏng liên quan (ID)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.relatedReportId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, relatedReportId: e.target.value }))
                      }
                      placeholder="Nhập ID báo cáo hư hỏng"
                      min={0}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      Metadata (JSON – lưu thêm thông tin tùy chỉnh)
                    </label>
                    <textarea
                      className="form-control font-monospace"
                      rows={4}
                      value={metadataInput}
                      onChange={(e) => setMetadataInput(e.target.value)}
                      placeholder='Ví dụ: { "cost": 500000, "location": "Kho A" }'
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                  Đóng
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
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

