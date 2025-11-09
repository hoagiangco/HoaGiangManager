'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { DamageReportVM, DamageReportStatus, DamageReportPriority, DeviceVM, StaffVM, Department, DeviceCategory } from '@/types';
import { format } from 'date-fns';
import FileManager from '@/components/FileManager';
import { getDamageReportPermissions, isAdmin } from '@/lib/auth/permissions';

// Handler Notes Editor Component
const HandlerNotesEditor = ({ reportId, value, onChange, onClick, isCard = false, canEdit = true }: { 
  reportId: number; 
  value: string; 
  onChange: (value: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  isCard?: boolean;
  canEdit?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, [isEditing]);

  const handleBlur = async () => {
    if (editValue !== value && !isSaving) {
      setIsSaving(true);
      try {
        await onChange(editValue);
      } catch (error) {
        // Error handled by parent
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent row selection
    if (onClick) {
      onClick(e);
    }
    // Only allow editing if canEdit is true
    if (!isEditing && canEdit) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        className="form-control form-control-sm"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        disabled={isSaving}
        style={{
          fontSize: isCard ? '0.8rem' : '0.75rem',
          padding: isCard ? '0.5rem' : '0.25rem 0.5rem',
          minHeight: isCard ? '3rem' : '2rem',
          maxHeight: isCard ? '6rem' : '4rem',
          resize: 'vertical',
          width: '100%',
          minWidth: isCard ? '100%' : '200px',
          lineHeight: '1.5',
          pointerEvents: 'auto'
        }}
        rows={isCard ? 3 : 2}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        cursor: canEdit ? 'text' : 'default',
        padding: isCard ? '0.5rem' : '0.25rem 0.5rem',
        minHeight: isCard ? '3rem' : '2rem',
        fontSize: isCard ? '0.8rem' : '0.75rem',
        color: value ? '#495057' : '#6c757d',
        fontStyle: value ? 'normal' : 'italic',
        border: '1px solid transparent',
        borderRadius: '4px',
        transition: 'background-color 0.2s, border-color 0.2s',
        maxWidth: isCard ? '100%' : '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.5',
        backgroundColor: isCard ? '#ffffff' : 'transparent',
        pointerEvents: canEdit ? 'auto' : 'none',
        userSelect: 'none',
        opacity: canEdit ? 1 : 0.7
      }}
      onMouseEnter={(e) => {
        if (canEdit) {
          e.currentTarget.style.backgroundColor = '#f8f9fa';
          e.currentTarget.style.borderColor = '#dee2e6';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isCard ? '#ffffff' : 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
      title={canEdit ? (value || 'Click để thêm ghi chú') : 'Chỉ người xử lý mới có thể chỉnh sửa'}
    >
      {isSaving ? 'Đang lưu...' : (value || 'Click để thêm ghi chú...')}
    </div>
  );
};

export default function DamageReportsPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reports, setReports] = useState<DamageReportVM[]>([]);
  const [allReports, setAllReports] = useState<DamageReportVM[]>([]);
  const [devices, setDevices] = useState<DeviceVM[]>([]);
  const [deviceCategories, setDeviceCategories] = useState<DeviceCategory[]>([]);
  const [staff, setStaff] = useState<StaffVM[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<ReturnType<typeof getDamageReportPermissions>>({
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canUpdateStatus: false,
  });
  const [selectedStatus, setSelectedStatus] = useState<DamageReportStatus | 0>(0);
  const [selectedPriority, setSelectedPriority] = useState<DamageReportPriority | 0>(0);
  const [selectedDevice, setSelectedDevice] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInputValue, setSearchInputValue] = useState(''); // Temporary value for search input
  const [myWorkFilter, setMyWorkFilter] = useState(false);
  const [myReportFilter, setMyReportFilter] = useState(false);
  const [currentUserStaffId, setCurrentUserStaffId] = useState<number | null>(null);
  const skipPageResetOnMyWorkToggle = useRef(false);
  const skipPageResetOnMyReportToggle = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // View mode state: 'table' or 'card', default to 'card' on mobile
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('reportDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // File Manager state
  const [showFileManager, setShowFileManager] = useState(false);
  const [fileManagerMode, setFileManagerMode] = useState<'image' | 'all'>('image');
  
  // Export Excel modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDepartment, setExportDepartment] = useState(0);
  const [exportFromDate, setExportFromDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')); // Start of year
  const [exportToDate, setExportToDate] = useState(format(new Date(), 'yyyy-MM-dd')); // Today
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Modal device filter state
  const [modalDeviceCategoryId, setModalDeviceCategoryId] = useState<number>(0);
  const [modalDeviceSearch, setModalDeviceSearch] = useState('');
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    id: 0,
    deviceId: undefined as number | undefined,
    damageLocation: '',
    deviceSelection: 'device' as 'device' | 'other', // 'device' or 'other'
    reporterId: 0,
    reportingDepartmentId: 0,
    handlerId: undefined as number | undefined,
    assignedDate: '',
    reportDate: format(new Date(), 'yyyy-MM-dd'),
    handlingDate: '',
    completedDate: '',
    estimatedCompletionDate: '',
    damageContent: '',
    images: [] as string[],
    status: DamageReportStatus.Pending,
    priority: DamageReportPriority.Normal,
    notes: '',
    handlerNotes: '',
    rejectionReason: '',
  });
  const [isEdit, setIsEdit] = useState(false);

  // Quick view state
  const [showQuickView, setShowQuickView] = useState(false);
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  const [quickReport, setQuickReport] = useState<DamageReportVM | null>(null);

  const cardBodyStyle = useMemo(() => {
    if (viewMode === 'card') {
      return {
        maxHeight: 'calc(100vh - 240px)',
        overflowY: 'auto' as const,
        paddingRight: '0.35rem',
        WebkitOverflowScrolling: 'touch' as const,
        overscrollBehavior: 'contain' as const,
      };
    }
    return undefined;
  }, [viewMode]);

  const filteredModalDevices = useMemo(() => {
    let list = devices;

    if (modalDeviceCategoryId > 0) {
      list = list.filter((device) => device.deviceCategoryId === modalDeviceCategoryId);
    }

    if (modalDeviceSearch.trim()) {
      const keyword = modalDeviceSearch.trim().toLowerCase();
      list = list.filter((device) => {
        const source = `${device.name || ''} ${device.serial || ''} ${device.deviceCategoryName || ''}`.toLowerCase();
        return source.includes(keyword);
      });
    }

    if (formData.deviceId) {
      const exists = list.some((device) => device.id === formData.deviceId);
      if (!exists) {
        const selectedDevice = devices.find((device) => device.id === formData.deviceId);
        if (selectedDevice) {
          list = [selectedDevice, ...list];
        }
      }
    }

    const seen = new Set<number>();
    return list.filter((device) => {
      if (seen.has(device.id)) {
        return false;
      }
      seen.add(device.id);
      return true;
    });
  }, [devices, modalDeviceCategoryId, modalDeviceSearch, formData.deviceId]);

  useEffect(() => {
    if (showModal) {
      setModalDeviceCategoryId(0);
      setModalDeviceSearch('');
      setIsDeviceDropdownOpen(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!deviceDropdownRef.current) return;
      if (!deviceDropdownRef.current.contains(event.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const openQuickView = async (reportId: number) => {
    try {
      setQuickViewLoading(true);
      setShowQuickView(true);
      // Fetch full record for reliable data
      const res = await api.get(`/damage-reports/${reportId}`);
      if (res.data.status) {
        setQuickReport(res.data.data as DamageReportVM);
      } else {
        toast.error('Không tải được dữ liệu báo cáo');
        setQuickReport(null);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi tải báo cáo');
      setQuickReport(null);
    } finally {
      setQuickViewLoading(false);
    }
  };

  const closeQuickView = () => {
    setShowQuickView(false);
    setQuickReport(null);
  };

  useEffect(() => {
    // Get current user from localStorage and detect mobile
    const init = () => {
      try {
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            const permissions = getDamageReportPermissions(user?.roles || []);
            setUserPermissions(permissions);
          }
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }

      if (typeof window !== 'undefined') {
        const onResize = () => {
          const isMobile = window.innerWidth < 768;
          setViewMode(isMobile ? 'card' : 'table');
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }
      return () => {};
    };

    const cleanup = init();
    return cleanup;
  }, []);

  // Load lists on mount
  useEffect(() => {
    loadData();
    loadDevices();
    loadDeviceCategories();
    loadStaff();
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus > 0) params.append('status', selectedStatus.toString());
      if (selectedPriority > 0) params.append('priority', selectedPriority.toString());
      if (selectedDevice > 0) params.append('deviceId', selectedDevice.toString());
      if (selectedDepartment > 0) params.append('departmentId', selectedDepartment.toString());
      if (searchKeyword) params.append('search', searchKeyword);

      const response = await api.get(`/damage-reports?${params.toString()}`);
      if (response.data.status) {
        setAllReports(response.data.data || []);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách báo cáo hư hỏng');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await api.get('/devices?cateId=0');
      if (response.data.status) {
        setDevices(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadDeviceCategories = async () => {
    try {
      const response = await api.get('/device-categories');
      if (response.data.status) {
        setDeviceCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading device categories:', error);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await api.get('/staff?departmentId=0');
      if (response.data.status) {
        setStaff(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
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

  const handlePrevImage = () => {
    if (selectedImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev === 0 ? selectedImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (selectedImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev === selectedImages.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation for image modal
  useEffect(() => {
    if (!showImageModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowImageModal(false);
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImageModal, currentImageIndex, selectedImages.length]);

  // Get current user staff ID (robust matching by userId/fid/id/email)
  useEffect(() => {
    if (!currentUser) return;
    if (staff.length === 0) return;

    const possibleUserIds: string[] = [];
    // Common keys where an id may live
    if (currentUser.userId) possibleUserIds.push(String(currentUser.userId));
    if ((currentUser as any).id) possibleUserIds.push(String((currentUser as any).id));
    if ((currentUser as any).fid) possibleUserIds.push(String((currentUser as any).fid));
    if ((currentUser as any).sub) possibleUserIds.push(String((currentUser as any).sub));

    const currentEmail: string | null = (currentUser as any).email ? String((currentUser as any).email).trim().toLowerCase() : null;

    // Development logging - helps debug staff matching
    if (process.env.NODE_ENV === 'development') {
      console.log('Resolve staff for user. ids:', possibleUserIds, 'email:', currentEmail);
      console.log('Staff snapshot:', staff.map(s => ({ id: s.id, name: s.name, userId: s.userId, email: (s.email || '').toLowerCase() })));
    }

    // Try by userId keys (exact match)
    let me = staff.find((s) => s.userId && possibleUserIds.some(uid => uid && s.userId === uid));
    
    // Try case-insensitive userId match
    if (!me) {
      me = staff.find((s) => s.userId && possibleUserIds.some(uid => 
        uid && s.userId && s.userId.toLowerCase() === uid.toLowerCase()
      ));
    }
    
    // Try by userId with trimmed whitespace
    if (!me) {
      me = staff.find((s) => s.userId && possibleUserIds.some(uid => 
        uid && s.userId && s.userId.trim() === uid.trim()
      ));
    }
    
    // Fallback by email (case-insensitive, trimmed)
    if (!me && currentEmail) {
      me = staff.find((s) => {
        const staffEmail = (s.email || '').trim().toLowerCase();
        return staffEmail && staffEmail === currentEmail;
      });
    }

    if (me) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Resolved currentUserStaffId:', me.id, me.name);
      }
      setCurrentUserStaffId(me.id);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('Unable to resolve staff for current user');
      }
      setCurrentUserStaffId(null);
    }
  }, [currentUser, staff]);

  // Filter and search logic
  useEffect(() => {
    loadData();
    // Only reset page if not skipping (for filter toggles)
    if (!skipPageResetOnMyWorkToggle.current && !skipPageResetOnMyReportToggle.current) {
      setCurrentPage(1);
    } else {
      skipPageResetOnMyWorkToggle.current = false;
      skipPageResetOnMyReportToggle.current = false;
    }
  }, [selectedStatus, selectedPriority, selectedDevice, selectedDepartment, searchKeyword, myWorkFilter, myReportFilter]);

  // Sort and pagination
  useEffect(() => {
    let filtered = [...allReports];

    // Filter by "My Work" - only show reports assigned to current user
    if (myWorkFilter && currentUserStaffId !== null) {
      filtered = filtered.filter(report => report.handlerId === currentUserStaffId);
    }

    // Filter by "My Report" - only show reports created by current user
    if (myReportFilter && currentUserStaffId !== null) {
      filtered = filtered.filter(report => report.reporterId === currentUserStaffId);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'reportDate':
          aValue = a.reportDate ? new Date(a.reportDate).getTime() : 0;
          bValue = b.reportDate ? new Date(b.reportDate).getTime() : 0;
          break;
        case 'status':
          aValue = a.status || 0;
          bValue = b.status || 0;
          break;
        case 'priority':
          aValue = a.priority || 0;
          bValue = b.priority || 0;
          break;
        case 'displayLocation':
          aValue = a.displayLocation || '';
          bValue = b.displayLocation || '';
          break;
        case 'reporterName':
          aValue = a.reporterName || '';
          bValue = b.reporterName || '';
          break;
        default:
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setReports(filtered);
  }, [allReports, sortField, sortDirection, myWorkFilter, myReportFilter, currentUserStaffId]);

  const handleNew = () => {
    // Get current user's staff info
    const currentStaff = currentUserStaffId ? staff.find(s => s.id === currentUserStaffId) : null;
    
    setFormData({
      id: 0,
      deviceId: undefined,
      damageLocation: '',
      deviceSelection: 'device',
      reporterId: currentUserStaffId || 0,
      reportingDepartmentId: currentStaff?.departmentId || 0,
      handlerId: undefined,
      assignedDate: '',
      reportDate: format(new Date(), 'yyyy-MM-dd'),
      handlingDate: '',
      completedDate: '',
      estimatedCompletionDate: '',
      damageContent: '',
      images: [],
      status: DamageReportStatus.Pending,
      priority: DamageReportPriority.Normal,
      notes: '',
      handlerNotes: '',
      rejectionReason: '',
    });
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = async () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn đúng 1 báo cáo để sửa');
      return;
    }

    try {
      // Ensure devices, staff, and departments are loaded first
      if (devices.length === 0) await loadDevices();
      if (staff.length === 0) await loadStaff();
      if (departments.length === 0) await loadDepartments();

      // Load full data from API to ensure all fields are available
      const response = await api.get(`/damage-reports/${selectedIds[0]}`);
      if (!response.data.status || !response.data.data) {
        toast.error('Không thể tải dữ liệu báo cáo');
        return;
      }

      const selectedReport = response.data.data;
      if (process.env.NODE_ENV === 'development') {
        console.log('Loaded report data:', selectedReport); // Debug log
      }
      
      // Determine deviceSelection: if deviceId exists and is valid, it's 'device', otherwise 'other'
      const isDevice = selectedReport.deviceId !== null && selectedReport.deviceId !== undefined && selectedReport.deviceId > 0;
      
      // Convert dates properly
      const formatDate = (dateStr: any) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return format(date, 'yyyy-MM-dd');
        } catch {
          return '';
        }
      };
      
      const formDataToSet = {
        id: selectedReport.id,
        deviceId: isDevice && selectedReport.deviceId ? Number(selectedReport.deviceId) : undefined,
        damageLocation: selectedReport.damageLocation || '',
        deviceSelection: (isDevice ? 'device' : 'other') as 'device' | 'other',
        reporterId: Number(selectedReport.reporterId) || 0,
        reportingDepartmentId: Number(selectedReport.reportingDepartmentId) || 0,
        handlerId: selectedReport.handlerId ? Number(selectedReport.handlerId) : undefined,
        assignedDate: formatDate(selectedReport.assignedDate),
        reportDate: formatDate(selectedReport.reportDate) || format(new Date(), 'yyyy-MM-dd'),
        handlingDate: formatDate(selectedReport.handlingDate),
        completedDate: formatDate(selectedReport.completedDate),
        estimatedCompletionDate: formatDate(selectedReport.estimatedCompletionDate),
        damageContent: selectedReport.damageContent || '',
        images: Array.isArray(selectedReport.images) ? selectedReport.images : (selectedReport.images ? (typeof selectedReport.images === 'string' ? JSON.parse(selectedReport.images) : []) : []),
        status: Number(selectedReport.status) || DamageReportStatus.Pending,
        priority: Number(selectedReport.priority) || DamageReportPriority.Normal,
        notes: selectedReport.notes || '',
        handlerNotes: selectedReport.handlerNotes || '',
        rejectionReason: selectedReport.rejectionReason || '',
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Form data to set:', formDataToSet); // Debug log
        console.log('Available devices:', devices.map(d => ({ id: d.id, name: d.name }))); // Debug
        console.log('Available staff:', staff.map(s => ({ id: s.id, name: s.name }))); // Debug
        console.log('Available departments:', departments.map(d => ({ id: d.id, name: d.name }))); // Debug
      }
      
      // Check if the IDs exist in the loaded options
      if (process.env.NODE_ENV === 'development') {
        if (formDataToSet.deviceId && !devices.find(d => d.id === formDataToSet.deviceId)) {
          console.warn(`Device ID ${formDataToSet.deviceId} not found in devices list`);
        }
        if (formDataToSet.reporterId && !staff.find(s => s.id === formDataToSet.reporterId)) {
          console.warn(`Reporter ID ${formDataToSet.reporterId} not found in staff list`);
        }
        if (formDataToSet.handlerId && !staff.find(s => s.id === formDataToSet.handlerId)) {
          console.warn(`Handler ID ${formDataToSet.handlerId} not found in staff list`);
        }
      }
      
      // Set form data immediately
      setFormData(formDataToSet);
      setIsEdit(true);
      setShowModal(true);
    } catch (error: any) {
      console.error('Error loading report for edit:', error);
      toast.error('Lỗi khi tải dữ liệu báo cáo: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 báo cáo để xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa các báo cáo đã chọn?')) {
      return;
    }

    try {
      for (const id of selectedIds) {
        await api.delete(`/damage-reports/${id}`);
      }
      toast.success('Xóa thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa báo cáo');
    }
  };

  const handleSave = async () => {
    // Validation
    if (formData.deviceSelection === 'device' && !formData.deviceId) {
      toast.error('Vui lòng chọn thiết bị');
      return;
    }
    if (formData.deviceSelection === 'other' && !formData.damageLocation?.trim()) {
      toast.error('Vui lòng nhập vị trí hư hỏng');
      return;
    }
    if (!formData.damageContent?.trim()) {
      toast.error('Vui lòng nhập nội dung hư hỏng');
      return;
    }
    if (!formData.reporterId) {
      toast.error('Vui lòng chọn người báo cáo');
      return;
    }
    // Auto-get department from reporter, but validate it exists
    const reporter = staff.find(s => s.id === formData.reporterId);
    if (!reporter?.departmentId) {
      toast.error('Người báo cáo chưa được gán phòng ban. Vui lòng cập nhật thông tin nhân viên trước.');
      return;
    }

    try {
      const payload: any = {
        deviceId: formData.deviceSelection === 'device' ? formData.deviceId : null,
        damageLocation: formData.deviceSelection === 'other' ? formData.damageLocation : null,
        reporterId: formData.reporterId,
        reportingDepartmentId: reporter?.departmentId || formData.reportingDepartmentId,
        handlerId: formData.handlerId || null,
        assignedDate: formData.assignedDate || null,
        reportDate: formData.reportDate,
        handlingDate: formData.handlingDate || null,
        completedDate: formData.completedDate || null,
        estimatedCompletionDate: formData.estimatedCompletionDate || null,
        damageContent: formData.damageContent.trim(),
        images: formData.images.length > 0 ? formData.images : null,
        status: formData.status,
        priority: formData.priority,
        notes: null, // Bỏ ghi chú chung
        handlerNotes: formData.handlerNotes || null,
        rejectionReason: formData.rejectionReason || null,
      };

      if (isEdit) {
        await api.put(`/damage-reports/${formData.id}`, { ...payload, id: formData.id });
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/damage-reports', payload);
        toast.success('Thêm mới thành công');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || (isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới'));
    }
  };

  const handleImageSelect = (url: string) => {
    let relativePath = url.trim();
    if (url.includes('://') || url.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        relativePath = urlObj.pathname;
      } catch {
        relativePath = url.startsWith('/') ? url : `/${url}`;
      }
    } else {
      relativePath = url.startsWith('/') ? url : `/${url}`;
    }

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, relativePath]
    }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Pagination
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = reports.slice(startIndex, endIndex);

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
      setSelectedIds(currentReports.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const getStatusBadge = (status: DamageReportStatus) => {
    const statusMap = {
      [DamageReportStatus.Pending]: { label: 'Chờ xử lý', class: 'badge bg-secondary', color: '#6c757d', bgColor: '#f8f9fa' },
      [DamageReportStatus.Assigned]: { label: 'Đã phân công', class: 'badge bg-info', color: '#0dcaf0', bgColor: '#cff4fc' },
      [DamageReportStatus.InProgress]: { label: 'Đang xử lý', class: 'badge bg-warning', color: '#ffc107', bgColor: '#fff3cd' },
      [DamageReportStatus.Completed]: { label: 'Hoàn thành', class: 'badge bg-success', color: '#198754', bgColor: '#d1e7dd' },
      [DamageReportStatus.Cancelled]: { label: 'Đã hủy', class: 'badge bg-dark', color: '#212529', bgColor: '#e9ecef' },
      [DamageReportStatus.Rejected]: { label: 'Từ chối', class: 'badge bg-danger', color: '#dc3545', bgColor: '#f8d7da' },
    };
    const statusInfo = statusMap[status] || { label: 'Không xác định', class: 'badge bg-light text-dark', color: '#6c757d', bgColor: '#f8f9fa' };
    return <span className={statusInfo.class} style={{ whiteSpace: 'nowrap' }}>{statusInfo.label}</span>;
  };

  const getStatusStyle = (status: DamageReportStatus) => {
    const statusMap = {
      [DamageReportStatus.Pending]: { color: '#6c757d', backgroundColor: '#f8f9fa', borderColor: '#dee2e6' },
      [DamageReportStatus.Assigned]: { color: '#0a58ca', backgroundColor: '#cff4fc', borderColor: '#0dcaf0' },
      [DamageReportStatus.InProgress]: { color: '#664d03', backgroundColor: '#fff3cd', borderColor: '#ffc107' },
      [DamageReportStatus.Completed]: { color: '#0f5132', backgroundColor: '#d1e7dd', borderColor: '#198754' },
      [DamageReportStatus.Cancelled]: { color: '#212529', backgroundColor: '#e9ecef', borderColor: '#212529' },
      [DamageReportStatus.Rejected]: { color: '#842029', backgroundColor: '#f8d7da', borderColor: '#dc3545' },
    };
    return statusMap[status] || { color: '#6c757d', backgroundColor: '#f8f9fa', borderColor: '#dee2e6' };
  };

  const getPriorityBadge = (priority: DamageReportPriority) => {
    const priorityMap = {
      [DamageReportPriority.Low]: { label: 'Thấp', class: 'badge bg-secondary', color: '#6c757d', bgColor: '#f8f9fa' },
      [DamageReportPriority.Normal]: { label: 'Bình thường', class: 'badge bg-primary', color: '#0d6efd', bgColor: '#cfe2ff' },
      [DamageReportPriority.High]: { label: 'Cao', class: 'badge bg-warning', color: '#ffc107', bgColor: '#fff3cd' },
      [DamageReportPriority.Urgent]: { label: 'Khẩn cấp', class: 'badge bg-danger', color: '#dc3545', bgColor: '#f8d7da' },
    };
    const priorityInfo = priorityMap[priority] || { label: 'Không xác định', class: 'badge bg-light text-dark', color: '#6c757d', bgColor: '#f8f9fa' };
    return <span className={priorityInfo.class} style={{ whiteSpace: 'nowrap' }}>{priorityInfo.label}</span>;
  };

  const getPriorityStyle = (priority: DamageReportPriority) => {
    const priorityMap = {
      [DamageReportPriority.Low]: { color: '#6c757d', backgroundColor: '#f8f9fa', borderColor: '#dee2e6' },
      [DamageReportPriority.Normal]: { color: '#0a58ca', backgroundColor: '#cfe2ff', borderColor: '#0d6efd' },
      [DamageReportPriority.High]: { color: '#664d03', backgroundColor: '#fff3cd', borderColor: '#ffc107' },
      [DamageReportPriority.Urgent]: { color: '#842029', backgroundColor: '#f8d7da', borderColor: '#dc3545' },
    };
    return priorityMap[priority] || { color: '#6c757d', backgroundColor: '#f8f9fa', borderColor: '#dee2e6' };
  };

  const canUpdateStatusForReport = (report?: DamageReportVM | null): boolean => {
    if (!report) return false;
    if (!userPermissions.canUpdateStatus) return false;
    if (isAdmin(currentUser?.roles)) return true;
    if (currentUserStaffId === null) return false;
    return report.handlerId === currentUserStaffId;
  };

  const handleStatusChange = async (reportId: number, newStatus: DamageReportStatus) => {
    const report = allReports.find((r) => r.id === reportId) || reports.find((r) => r.id === reportId);

    if (!canUpdateStatusForReport(report)) {
      toast.error('Bạn chỉ có thể cập nhật trạng thái khi là người xử lý báo cáo này');
      return;
    }

    try {
      const response = await api.put(`/damage-reports/${reportId}/status`, { status: newStatus });
      if (response.data.status) {
        toast.success('Cập nhật trạng thái thành công');
        loadData();
      } else {
        toast.error(response.data.error || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handlePriorityChange = async (reportId: number, newPriority: DamageReportPriority) => {
    if (!currentUser?.id) {
      toast.error('Không thể xác định người dùng');
      return;
    }

    try {
      const response = await api.put(`/damage-reports/${reportId}/priority`, { priority: newPriority });
      if (response.data.status) {
        toast.success('Cập nhật ưu tiên thành công');
        loadData();
      } else {
        toast.error(response.data.error || 'Lỗi khi cập nhật ưu tiên');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Lỗi khi cập nhật ưu tiên');
    }
  };

  const handleHandlerNotesChange = async (reportId: number, newHandlerNotes: string): Promise<void> => {
    if (!currentUser?.id) {
      toast.error('Không thể xác định người dùng');
      throw new Error('User not authenticated');
    }

    try {
      const response = await api.put(`/damage-reports/${reportId}/handler-notes`, { handlerNotes: newHandlerNotes });
      if (response.data.status) {
        // Update local state immediately for better UX
        setReports(prev => prev.map(r => 
          r.id === reportId ? { ...r, handlerNotes: newHandlerNotes } : r
        ));
        setAllReports(prev => prev.map(r => 
          r.id === reportId ? { ...r, handlerNotes: newHandlerNotes } : r
        ));
        toast.success('Cập nhật ghi chú thành công');
      } else {
        const errorMsg = response.data.error || 'Lỗi khi cập nhật ghi chú';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Lỗi khi cập nhật ghi chú';
      toast.error(errorMsg);
      throw error;
    }
  };

  // Handle table scroll
  useEffect(() => {
    const tableContainer = document.getElementById('damage-reports-table-responsive');
    const scrollHint = document.querySelector('.table-scroll-hint');
    if (!tableContainer) return;

    const handleScroll = () => {
      const { scrollLeft } = tableContainer;
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
  }, [currentReports]);

  // Auto-set reporter and department for current user when opening create modal
  useEffect(() => {
    if (!showModal || isEdit) return;
    if (!currentUser || !currentUser.userId) return;
    if (!staff || staff.length === 0) return;

    const me = staff.find((s) => s.userId === currentUser.userId);
    if (me) {
      setFormData((prev) => ({
        ...prev,
        reporterId: me.id,
        reportingDepartmentId: me.departmentId || 0,
      }));
    }
  }, [showModal, isEdit, staff, currentUser]);

  // Open Export Modal
  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  // Export to Excel function
  const handleExportExcel = async () => {
    try {
      // Validate dates
      if (!exportFromDate || !exportToDate) {
        toast.error('Vui lòng chọn khoảng thời gian');
        return;
      }

      const fromDate = new Date(exportFromDate);
      const toDate = new Date(exportToDate);
      toDate.setHours(23, 59, 59, 999); // End of day

      if (fromDate > toDate) {
        toast.error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
        return;
      }

      // Check if there's data to export before showing loading toast
      const fromCheck = new Date(exportFromDate);
      fromCheck.setHours(0, 0, 0, 0);
      const toCheck = new Date(exportToDate);
      toCheck.setHours(23, 59, 59, 999);

      // Filter reports on client-side to check if there's any data
      const hasData = allReports.some(report => {
        // Check department filter
        if (exportDepartment > 0 && report.reportingDepartmentId !== exportDepartment) {
          return false;
        }
        
        // Check date range
        if (report.reportDate) {
          const reportDate = new Date(report.reportDate);
          reportDate.setHours(0, 0, 0, 0);
          if (reportDate < fromCheck || reportDate > toCheck) {
            return false;
          }
        } else {
          return false; // Skip reports without reportDate
        }
        
        return true;
      });

      if (!hasData) {
        const deptName = exportDepartment > 0 
          ? (departments.find(d => d.id === exportDepartment)?.name || 'bộ phận đã chọn')
          : 'tất cả bộ phận';
        const dateRange = `${format(fromDate, 'dd/MM/yyyy')} đến ${format(toDate, 'dd/MM/yyyy')}`;
        toast.error(`Không có dữ liệu để xuất cho ${deptName} trong khoảng thời gian từ ${dateRange}. Vui lòng chọn khoảng thời gian khác hoặc bộ phận khác.`);
        return;
      }

      // Show loading only if we have data
      toast.info('Đang xuất Excel...');

      // Build query string
      const params = new URLSearchParams({
        departmentId: exportDepartment.toString(),
        fromDate: exportFromDate,
        toDate: exportToDate,
      });

      // Call API to export Excel
      const response = await api.get(`/damage-reports/export?${params.toString()}`, {
        responseType: 'blob', // Important for binary data
      });

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `BaoCaoHuHong_${format(fromDate, 'yyyyMMdd')}_${format(toDate, 'yyyyMMdd')}.xlsx`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, '');
          // Decode URI component if needed
          try {
            fileName = decodeURIComponent(fileName);
          } catch (e) {
            // If decode fails, use as is
          }
        }
      }

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setShowExportModal(false);
      toast.success('Xuất Excel thành công!');
    } catch (error: any) {
      console.error('Export error:', error);
      
      // Try to get error message from response
      let errorMessage = 'Lỗi khi xuất Excel';
      if (error.response?.data) {
        try {
          // If response is JSON
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use default message
          errorMessage = error.response.status === 403 
            ? 'Bạn không có quyền xuất Excel' 
            : errorMessage;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  // Loading guard
  if (loading) return (
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

  // Main render
  const __view = (
    <div className="container-fluid" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h4 className="mb-0 mb-2 mb-md-0">LIST HƯ HỎNG</h4>
            <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'wrap', rowGap: '0.25rem', justifyContent: 'flex-end', marginRight: '1rem' }}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-md-none"
                onClick={() => setFiltersOpen((s) => !s)}
                aria-pressed={!filtersOpen}
                title={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
              >
                <i className={`fas ${filtersOpen ? 'fa-chevron-up' : 'fa-filter'}`}></i>
              </button>
              <button 
                className={`btn btn-sm ${myWorkFilter ? 'btn-info' : 'btn-outline-info'}`}
                onClick={() => {
                  if (currentUserStaffId === null) {
                    toast.warning('Tài khoản của bạn chưa liên kết với nhân viên, không thể lọc My Work.');
                    return;
                  }
                  skipPageResetOnMyWorkToggle.current = true;
                  setMyWorkFilter(!myWorkFilter);
                  // Disable My Report when My Work is active
                  if (!myWorkFilter) {
                    setMyReportFilter(false);
                  }
                }}
                title="Lọc công việc của tôi"
              >
                <i className="fas fa-user-tie"></i>
                <span className="d-none d-md-inline ms-1">{myWorkFilter ? 'All' : 'My Work'}</span>
              </button>
              <button 
                className={`btn btn-sm ${myReportFilter ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => {
                  if (currentUserStaffId === null) {
                    toast.warning('Tài khoản của bạn chưa liên kết với nhân viên, không thể lọc My Report.');
                    return;
                  }
                  skipPageResetOnMyReportToggle.current = true;
                  setMyReportFilter(!myReportFilter);
                  // Disable My Work when My Report is active
                  if (!myReportFilter) {
                    setMyWorkFilter(false);
                  }
                }}
                title="Lọc báo cáo của tôi"
              >
                <i className="fas fa-file-alt"></i>
                <span className="d-none d-md-inline ms-1">{myReportFilter ? 'All' : 'My Report'}</span>
              </button>
              {isAdmin(currentUser?.roles) && (
                <button 
                  className="btn btn-success btn-sm d-none d-md-inline-flex"
                  onClick={handleOpenExportModal}
                  title="Xuất Excel"
                >
                  <i className="fas fa-file-excel"></i>
                  <span className="ms-1">Xuất Excel</span>
                </button>
              )}
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleNew}
                title="Thêm mới"
              >
                <i className="fas fa-plus"></i>
              </button>
              {userPermissions.canEdit && (
                <button 
                  className="btn btn-success btn-sm" 
                  onClick={handleEdit}
                  title="Sửa"
                >
                  <i className="fas fa-edit"></i>
                </button>
              )}
              {userPermissions.canDelete && (
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={handleDelete}
                  title="Xóa"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          </div>
          
          {/* Filter Section */}
          <div className={`card mb-3 filter-card ${filtersOpen ? 'filter-open' : 'filter-collapsed'}`} style={{ backgroundColor: '#f8f9fa' }}>
            <div className="card-body py-2">
              <div className="row g-2">
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label small">Trạng thái</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(Number(e.target.value) as DamageReportStatus | 0)}
                  >
                    <option value="0">Tất cả</option>
                    <option value={DamageReportStatus.Pending}>Chờ xử lý</option>
                    <option value={DamageReportStatus.InProgress}>Đang xử lý</option>
                    <option value={DamageReportStatus.Completed}>Hoàn thành</option>
                    <option value={DamageReportStatus.Cancelled}>Đã hủy</option>
                    <option value={DamageReportStatus.Rejected}>Từ chối</option>
                  </select>
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label small">Ưu tiên</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(Number(e.target.value) as DamageReportPriority | 0)}
                  >
                    <option value="0">Tất cả</option>
                    <option value={DamageReportPriority.Low}>Thấp</option>
                    <option value={DamageReportPriority.Normal}>Bình thường</option>
                    <option value={DamageReportPriority.High}>Cao</option>
                    <option value={DamageReportPriority.Urgent}>Khẩn cấp</option>
                  </select>
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
                  <label className="form-label small">Tìm kiếm</label>
                  <div className="d-flex gap-1">
                    <div className="input-group input-group-sm flex-grow-1">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tìm kiếm..."
                        value={searchInputValue}
                        onChange={(e) => setSearchInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSearchKeyword(searchInputValue);
                          }
                        }}
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setSearchKeyword(searchInputValue)}
                        title="Tìm kiếm"
                      >
                        <i className="fas fa-search"></i>
                      </button>
                    </div>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      type="button"
                      onClick={() => {
                        setSearchKeyword('');
                        setSearchInputValue('');
                        setSelectedStatus(0);
                        setSelectedPriority(0);
                        setSelectedDepartment(0);
                        setSelectedDevice(0);
                      }}
                      title="Xóa bộ lọc"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <i className="fas fa-times-circle"></i>
                      <span className="d-none d-md-inline ms-1">Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
            <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
              <div className="d-flex align-items-center gap-1" style={{ flexWrap: 'nowrap' }}>
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
              <div className="btn-group" role="group" style={{ marginLeft: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('table')}
                  title="Xem dạng bảng"
                >
                  <i className="fas fa-table"></i>
                  <span className="d-none d-md-inline ms-1">Bảng</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('card')}
                  title="Xem dạng card"
                >
                  <i className="fas fa-th-large"></i>
                  <span className="d-none d-md-inline ms-1">Card</span>
                </button>
              </div>
            </div>
            <div style={{ flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                Hiển thị {startIndex + 1}-{Math.min(endIndex, reports.length)} của {reports.length} báo cáo
              </span>
            </div>
          </div>
        </div>
        <div className="card-body" style={cardBodyStyle}>
          {/* Table View */}
          {viewMode === 'table' && (
            <div
              style={{
                maxHeight: 'calc(100vh - 260px)',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                paddingRight: '0.35rem',
              }}
            >
              <div className="table-scroll-hint" style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
                <i className="fas fa-arrows-alt-h"></i> Cuộn ngang để xem thêm
              </div>
              <div 
                className="table-responsive" 
                id="damage-reports-table-responsive"
                style={{
                  overflowX: 'scroll',
                  width: '100%',
                  minHeight: '400px',
                  maxWidth: '100%',
                  WebkitOverflowScrolling: 'touch',
                  position: 'relative',
                  scrollBehavior: 'smooth',
                  touchAction: 'pan-x',
                }}
              >
            <table className="table table-bordered table-hover" style={{ marginBottom: 0, minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>
                    <div className="d-flex align-items-center gap-1">
                      <input
                        type="checkbox"
                        checked={currentReports.length > 0 && selectedIds.length === currentReports.length}
                        onChange={handleSelectAll}
                        style={{ transform: 'scale(1.25)', transformOrigin: 'left center' }}
                      />
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer', minWidth: '150px' }} onClick={() => handleSort('displayLocation')}>
                    Vị trí/Thiết bị {getSortIcon('displayLocation')}
                  </th>
                  <th style={{ minWidth: '100px' }}>Trạng thái</th>
                  <th style={{ minWidth: '100px' }}>Ưu tiên</th>
                  <th style={{ cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('reporterName')}>
                    Người báo cáo {getSortIcon('reporterName')}
                  </th>
                  <th style={{ minWidth: '120px' }}>Người xử lý</th>
                  <th style={{ cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('reportDate')}>
                    Ngày báo cáo {getSortIcon('reportDate')}
                  </th>
                  <th style={{ minWidth: '120px' }}>Người cập nhật</th>
                  <th style={{ minWidth: '200px' }}>Nội dung hư hỏng</th>
                  <th style={{ minWidth: '200px' }}>Ghi chú người xử lý</th>
                </tr>
              </thead>
              <tbody>
                {currentReports.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentReports.map((report) => (
                    <tr key={report.id} style={{ cursor: report.id && selectedIds.includes(report.id) ? 'pointer' : 'default' }}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(report.id)}
                            onChange={() => handleCheckboxChange(report.id)}
                            style={{ transform: 'scale(1.25)', transformOrigin: 'left center' }}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            title="Xem nhanh"
                            onClick={(e) => { e.stopPropagation(); openQuickView(report.id); }}
                            style={{ padding: '0.15rem 0.35rem', lineHeight: 1 }}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        {report.displayLocation || 'Không xác định'}
                        {report.isOverdue && (
                          <i className="fas fa-exclamation-triangle text-danger ms-1" title="Quá hạn"></i>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '0.5rem 0.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                          <select
                            className="form-control form-control-sm damage-report-status-select"
                            value={report.status}
                            onChange={(e) => handleStatusChange(report.id, Number(e.target.value) as DamageReportStatus)}
                            disabled={!canUpdateStatusForReport(report)}
                            style={{
                              width: 'auto',
                              minWidth: '80px',
                              maxWidth: '100px',
                              fontSize: '0.7rem',
                              fontWeight: '500',
                              padding: '0.125rem 0.375rem',
                              height: '1.75rem',
                              lineHeight: '1.25',
                              borderWidth: '1.5px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              ...getStatusStyle(report.status)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value={DamageReportStatus.Pending} style={{ backgroundColor: '#f8f9fa', color: '#6c757d', fontSize: '0.7rem' }}>Chờ xử lý</option>
                            <option value={DamageReportStatus.InProgress} style={{ backgroundColor: '#fff3cd', color: '#664d03', fontSize: '0.7rem' }}>Đang xử lý</option>
                            <option value={DamageReportStatus.Completed} style={{ backgroundColor: '#d1e7dd', color: '#0f5132', fontSize: '0.7rem' }}>Hoàn thành</option>
                            <option value={DamageReportStatus.Cancelled} style={{ backgroundColor: '#e9ecef', color: '#212529', fontSize: '0.7rem' }}>Đã hủy</option>
                            <option value={DamageReportStatus.Rejected} style={{ backgroundColor: '#f8d7da', color: '#842029', fontSize: '0.7rem' }}>Từ chối</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '0.5rem 0.25rem' }}>
                        <select
                          className="form-control form-control-sm damage-report-priority-select"
                          value={report.priority}
                          onChange={(e) => handlePriorityChange(report.id, Number(e.target.value) as DamageReportPriority)}
                          disabled={!userPermissions.canEdit}
                          style={{
                            width: 'auto',
                            minWidth: '80px',
                            maxWidth: '100px',
                            fontSize: '0.7rem',
                            fontWeight: '500',
                            padding: '0.125rem 0.375rem',
                            height: '1.75rem',
                            lineHeight: '1.25',
                            borderWidth: '1.5px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            ...getPriorityStyle(report.priority)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value={DamageReportPriority.Low} style={{ backgroundColor: '#f8f9fa', color: '#6c757d', fontSize: '0.7rem' }}>Thấp</option>
                          <option value={DamageReportPriority.Normal} style={{ backgroundColor: '#cfe2ff', color: '#0a58ca', fontSize: '0.7rem' }}>Bình thường</option>
                          <option value={DamageReportPriority.High} style={{ backgroundColor: '#fff3cd', color: '#664d03', fontSize: '0.7rem' }}>Cao</option>
                          <option value={DamageReportPriority.Urgent} style={{ backgroundColor: '#f8d7da', color: '#842029', fontSize: '0.7rem' }}>Khẩn cấp</option>
                        </select>
                      </td>
                      <td>{report.reporterName || 'N/A'}</td>
                      <td>{report.handlerName || 'Chưa phân công'}</td>
                      <td>{report.reportDate ? format(new Date(report.reportDate), 'dd/MM/yyyy') : 'N/A'}</td>
                      <td>{report.updatedByName || '-'}</td>
                      <td>
                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {report.damageContent || 'N/A'}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <HandlerNotesEditor
                          reportId={report.id}
                          value={report.handlerNotes || ''}
                          onChange={(newValue) => handleHandlerNotesChange(report.id, newValue)}
                          canEdit={userPermissions.canEdit || (currentUserStaffId !== null && report.handlerId === currentUserStaffId)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
          )}

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="row g-3">
              {currentReports.length === 0 ? (
                <div className="col-12 text-center py-5">
                  <span className="text-muted">Không có dữ liệu</span>
                </div>
              ) : (
                currentReports.map((report) => (
                  <div key={report.id} className="col-12 col-md-6 col-lg-4">
                    <div 
                      className="card h-100 shadow-sm damage-report-card" 
                      style={{ 
                        borderLeft: `4px solid ${getPriorityStyle(report.priority).borderColor || '#dee2e6'}`,
                        borderBottom: `3px solid ${getPriorityStyle(report.priority).borderColor || '#dee2e6'}`,
                        cursor: 'default',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      {/* Card Header */}
                      <div 
                        className="card-header p-3" 
                        style={{ 
                          backgroundColor: '#f0f2f5', 
                          borderBottom: '2px solid #e9ecef',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleCheckboxChange(report.id)}
                      >
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <h6 className="mb-1" style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: '600',
                            color: '#212529',
                            lineHeight: '1.3',
                            wordBreak: 'break-word'
                          }}>
                            {report.displayLocation || 'Không xác định'}
                            {report.isOverdue && (
                              <i className="fas fa-exclamation-triangle text-danger ms-1" title="Quá hạn"></i>
                            )}
                          </h6>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              <i className="fas fa-calendar-alt me-1"></i>
                              {report.reportDate ? format(new Date(report.reportDate), 'dd/MM/yyyy') : 'N/A'}
                            </small>
                            {report.daysSinceReport !== undefined && (
                              <small className="badge bg-light text-dark" style={{ fontSize: '0.7rem' }}>
                                {report.daysSinceReport} ngày
                              </small>
                            )}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-3" style={{ flexShrink: 0, marginRight: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(report.id)}
                            onChange={() => handleCheckboxChange(report.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              marginTop: '0.25rem',
                              cursor: 'pointer',
                              transform: 'scale(1.7)',
                              transformOrigin: 'left center'
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            title="Xem nhanh"
                            onClick={(e) => { e.stopPropagation(); openQuickView(report.id); }}
                            style={{ 
                              padding: '0.28rem 0.35rem',
                              lineHeight: 1,
                              marginTop: '0.25rem',
                              fontSize: '1.3rem',
                              minWidth: 'auto',
                              width: 'auto',
                              height: 'auto'
                            }}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="card-body p-3" style={{ backgroundColor: '#fafbfc' }}>
                        {/* Status and Priority Row */}
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <label className="small text-muted d-block mb-1" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                              Trạng thái
                            </label>
                            <select
                              className="form-control form-control-sm damage-report-status-select"
                              value={report.status}
                              onChange={(e) => handleStatusChange(report.id, Number(e.target.value) as DamageReportStatus)}
                              disabled={!canUpdateStatusForReport(report)}
                              style={{
                                width: '100%',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                padding: '0.25rem 0.5rem',
                                height: '2rem',
                                lineHeight: '1.25',
                                borderWidth: '1.5px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                ...getStatusStyle(report.status)
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value={DamageReportStatus.Pending} style={{ backgroundColor: '#f8f9fa', color: '#6c757d', fontSize: '0.75rem' }}>Chờ xử lý</option>
                              <option value={DamageReportStatus.InProgress} style={{ backgroundColor: '#fff3cd', color: '#664d03', fontSize: '0.75rem' }}>Đang xử lý</option>
                              <option value={DamageReportStatus.Completed} style={{ backgroundColor: '#d1e7dd', color: '#0f5132', fontSize: '0.75rem' }}>Hoàn thành</option>
                              <option value={DamageReportStatus.Cancelled} style={{ backgroundColor: '#e9ecef', color: '#212529', fontSize: '0.75rem' }}>Đã hủy</option>
                              <option value={DamageReportStatus.Rejected} style={{ backgroundColor: '#f8d7da', color: '#842029', fontSize: '0.75rem' }}>Từ chối</option>
                            </select>
                          </div>
                          <div className="col-6">
                            <label className="small text-muted d-block mb-1" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                              Ưu tiên
                            </label>
                            <select
                              className="form-control form-control-sm damage-report-priority-select"
                              value={report.priority}
                              onChange={(e) => handlePriorityChange(report.id, Number(e.target.value) as DamageReportPriority)}
                              disabled={!userPermissions.canEdit}
                              style={{
                                width: '100%',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                padding: '0.25rem 0.5rem',
                                height: '2rem',
                                lineHeight: '1.25',
                                borderWidth: '1.5px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                ...getPriorityStyle(report.priority)
                              }}
                            >
                              <option value={DamageReportPriority.Low} style={{ backgroundColor: '#f8f9fa', color: '#6c757d', fontSize: '0.75rem' }}>Thấp</option>
                              <option value={DamageReportPriority.Normal} style={{ backgroundColor: '#cfe2ff', color: '#0a58ca', fontSize: '0.75rem' }}>Bình thường</option>
                              <option value={DamageReportPriority.High} style={{ backgroundColor: '#fff3cd', color: '#664d03', fontSize: '0.75rem' }}>Cao</option>
                              <option value={DamageReportPriority.Urgent} style={{ backgroundColor: '#f8d7da', color: '#842029', fontSize: '0.75rem' }}>Khẩn cấp</option>
                            </select>
                          </div>
                        </div>

                        {/* People Info Row */}
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <div className="d-flex align-items-center gap-1 mb-1">
                              <i className="fas fa-user text-muted" style={{ fontSize: '0.7rem' }}></i>
                              <label className="small text-muted mb-0" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                                Người báo cáo
                              </label>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#495057', lineHeight: '1.3' }}>
                              {report.reporterName || 'N/A'}
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="d-flex align-items-center gap-1 mb-1">
                              <i className="fas fa-user-cog text-muted" style={{ fontSize: '0.7rem' }}></i>
                              <label className="small text-muted mb-0" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                                Người xử lý
                              </label>
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '500', color: report.handlerName ? '#495057' : '#6c757d', lineHeight: '1.3', fontStyle: report.handlerName ? 'normal' : 'italic' }}>
                              {report.handlerName || 'Chưa phân công'}
                            </div>
                          </div>
                        </div>

                        {/* Damage Content */}
                        <div className="mb-3">
                          <div className="d-flex align-items-center gap-1 mb-1">
                            <i className="fas fa-file-alt text-muted" style={{ fontSize: '0.7rem' }}></i>
                            <label className="small text-muted mb-0" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                              Nội dung hư hỏng
                            </label>
                          </div>
                          <div 
                            style={{ 
                              fontSize: '0.8rem',
                              color: '#495057',
                              lineHeight: '1.5',
                              maxHeight: '80px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              wordBreak: 'break-word'
                            }}
                          >
                            {report.damageContent || 'N/A'}
                          </div>
                        </div>

                        {/* Handler Notes */}
                        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex align-items-center gap-1 mb-1">
                            <i className="fas fa-sticky-note text-muted" style={{ fontSize: '0.7rem' }}></i>
                            <label className="small text-muted mb-0" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                              Ghi chú người xử lý
                            </label>
                          </div>
                          <HandlerNotesEditor
                            reportId={report.id}
                            value={report.handlerNotes || ''}
                            onChange={(newValue) => handleHandlerNotesChange(report.id, newValue)}
                            isCard={true}
                            canEdit={userPermissions.canEdit || (currentUserStaffId !== null && report.handlerId === currentUserStaffId)}
                          />
                        </div>

                        {/* Images */}
                        {report.images && report.images.length > 0 && (
                          <div>
                            <div className="d-flex align-items-center gap-1 mb-2">
                              <i className="fas fa-images text-muted" style={{ fontSize: '0.7rem' }}></i>
                              <label className="small text-muted mb-0" style={{ fontSize: '0.7rem', fontWeight: '500' }}>
                                Hình ảnh ({report.images.length})
                              </label>
                            </div>
                            <div className="d-flex gap-1 flex-wrap">
                              {report.images.slice(0, 4).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Hình ${idx + 1}`}
                                  onClick={() => {
                                    if (report.images && Array.isArray(report.images)) {
                                      setSelectedImages(report.images);
                                      setCurrentImageIndex(idx);
                                      setShowImageModal(true);
                                    }
                                  }}
                                  style={{
                                    width: '55px',
                                    height: '55px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #dee2e6',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                />
                              ))}
                              {report.images.length > 4 && (
                                <div
                                  className="d-flex align-items-center justify-content-center"
                                  onClick={() => {
                                    if (report.images && Array.isArray(report.images)) {
                                      setSelectedImages(report.images);
                                      setCurrentImageIndex(4);
                                      setShowImageModal(true);
                                    }
                                  }}
                                  style={{
                                    width: '55px',
                                    height: '55px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px',
                                    border: '1px solid #dee2e6',
                                    fontSize: '0.7rem',
                                    color: '#6c757d',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  +{report.images.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-3">
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </li>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <li key={page} className="page-item disabled">
                        <span className="page-link">...</span>
                      </li>
                    );
                  }
                  return null;
                })}
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

      {/* Modal: Add/Edit Damage Report */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{isEdit ? 'Sửa báo cáo hư hỏng' : 'Thêm báo cáo hư hỏng'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label mb-1">Loại hư hỏng <span className="text-danger">*</span></label>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="deviceSelection" id="modalDeviceSelDevice" checked={formData.deviceSelection === 'device'} onChange={() => setFormData({ ...formData, deviceSelection: 'device', damageLocation: '' })} />
                      <label className="form-check-label" htmlFor="modalDeviceSelDevice">Chọn thiết bị</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="deviceSelection" id="modalDeviceSelOther" checked={formData.deviceSelection === 'other'} onChange={() => setFormData({ ...formData, deviceSelection: 'other', deviceId: undefined })} />
                      <label className="form-check-label" htmlFor="modalDeviceSelOther">Khác (hư hỏng tổng thể)</label>
                    </div>
                  </div>

                  {formData.deviceSelection === 'device' ? (
                    <div className="col-12">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label mb-1">Danh mục thiết bị</label>
                          <select
                            className="form-control"
                            value={modalDeviceCategoryId}
                            onChange={(e) => setModalDeviceCategoryId(Number(e.target.value) || 0)}
                          >
                            <option value={0}>Tất cả danh mục</option>
                            {deviceCategories.map((cate) => (
                              <option key={cate.id} value={cate.id}>{cate.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label mb-1">Thiết bị <span className="text-danger">*</span></label>
                          <div
                            ref={deviceDropdownRef}
                            className="position-relative"
                          >
                            <button
                              type="button"
                              className="form-control text-start d-flex justify-content-between align-items-center"
                              onClick={() => setIsDeviceDropdownOpen((prev) => !prev)}
                              style={{ cursor: 'pointer' }}
                            >
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(() => {
                                  if (formData.deviceId) {
                                    const selected = devices.find((d) => d.id === formData.deviceId);
                                    if (selected) {
                                      return `${selected.name}${selected.serial ? ` (${selected.serial})` : ''}`;
                                    }
                                  }
                                  return '-- Chọn thiết bị --';
                                })()}
                              </span>
                              <i className={`fas fa-chevron-${isDeviceDropdownOpen ? 'up' : 'down'} ms-2 text-muted`} />
                            </button>
                            {isDeviceDropdownOpen && (
                              <div
                                className="border rounded shadow-sm mt-1"
                                style={{
                                  position: 'absolute',
                                  zIndex: 1080,
                                  backgroundColor: '#fff',
                                  width: '100%',
                                  maxHeight: '280px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div className="p-2 border-bottom bg-light">
                                  <input
                                    autoFocus
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Nhập tên, mã hoặc serial..."
                                    value={modalDeviceSearch}
                                    onChange={(e) => setModalDeviceSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div
                                  style={{
                                    maxHeight: '220px',
                                    overflowY: 'auto',
                                  }}
                                >
                                  <button
                                    type="button"
                                    className={`dropdown-item text-start ${!formData.deviceId ? 'active' : ''}`}
                                    onClick={() => {
                                      setFormData({ ...formData, deviceId: undefined });
                                      setIsDeviceDropdownOpen(false);
                                    }}
                                  >
                                    -- Chưa chọn thiết bị --
                                  </button>
                                  {filteredModalDevices.length === 0 && (
                                    <div className="px-3 py-2 text-muted small">
                                      Không tìm thấy thiết bị phù hợp. Hãy đổi danh mục hoặc từ khóa tìm kiếm.
                                    </div>
                                  )}
                                  {filteredModalDevices.map((d) => {
                                    const isSelected = formData.deviceId === d.id;
                                    return (
                                      <button
                                        type="button"
                                        key={d.id}
                                        className={`dropdown-item text-start ${isSelected ? 'active' : ''}`}
                                        onClick={() => {
                                          setFormData({ ...formData, deviceId: d.id });
                                          setIsDeviceDropdownOpen(false);
                                        }}
                                      >
                                        <div className="fw-semibold">{d.name}</div>
                                        {(d.serial || d.deviceCategoryName) && (
                                          <div className="small text-muted">
                                            {[d.serial, d.deviceCategoryName].filter(Boolean).join(' • ')}
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="col-12">
                      <label className="form-label">Vị trí/Mô tả hư hỏng <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" value={formData.damageLocation} onChange={(e) => setFormData({ ...formData, damageLocation: e.target.value })} placeholder="Ví dụ: Hệ thống điện, Tường nhà..." />
                    </div>
                  )}

                  <div className="col-12 col-md-6">
                    <label className="form-label">Người báo cáo <span className="text-danger">*</span></label>
                    <select 
                      className="form-control" 
                      value={formData.reporterId} 
                      onChange={(e) => setFormData({ ...formData, reporterId: Number(e.target.value) })}
                      disabled={currentUserStaffId !== null}
                    >
                      <option value={0}>-- Chọn người báo cáo --</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <small className="text-muted">Phòng ban: {(() => { const r = staff.find(s => s.id === formData.reporterId); const dept = departments.find(d => d.id === (r?.departmentId || 0)); return dept?.name || '-'; })()}</small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Người xử lý</label>
                    <select className="form-control" value={formData.handlerId || 0} onChange={(e) => setFormData({ ...formData, handlerId: Number(e.target.value) || undefined })}>
                      <option value={0}>-- Chưa phân công --</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Ngày báo cáo <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={formData.reportDate} onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Ngày hoàn thành</label>
                    <input type="date" className="form-control" value={formData.completedDate} onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })} />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Ưu tiên</label>
                    <select className="form-control" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as DamageReportPriority })}>
                      <option value={DamageReportPriority.Low}>Thấp</option>
                      <option value={DamageReportPriority.Normal}>Bình thường</option>
                      <option value={DamageReportPriority.High}>Cao</option>
                      <option value={DamageReportPriority.Urgent}>Khẩn cấp</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) as DamageReportStatus })}>
                      <option value={DamageReportStatus.Pending}>Chờ xử lý</option>
                      <option value={DamageReportStatus.InProgress}>Đang xử lý</option>
                      <option value={DamageReportStatus.Completed}>Hoàn thành</option>
                      <option value={DamageReportStatus.Cancelled}>Đã hủy</option>
                      <option value={DamageReportStatus.Rejected}>Từ chối</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Nội dung hư hỏng <span className="text-danger">*</span></label>
                    <textarea className="form-control" rows={3} value={formData.damageContent} onChange={(e) => setFormData({ ...formData, damageContent: e.target.value })}></textarea>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Ghi chú người xử lý</label>
                    <textarea className="form-control" rows={2} value={formData.handlerNotes} onChange={(e) => setFormData({ ...formData, handlerNotes: e.target.value })}></textarea>
                  </div>

                  <div className="col-12">
                    <label className="form-label d-flex align-items-center justify-content-between">
                      <span>Hình ảnh</span>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { 
                        setFileManagerMode('image'); 
                        setShowFileManager(true);
                      }}>Chọn hình</button>
                    </label>
                    {formData.images && formData.images.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {formData.images.map((img, idx) => (
                          <div key={`${img}-${idx}`} className="position-relative" style={{ width: 96, height: 72 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, border: '1px solid #dee2e6' }} />
                            <button type="button" className="btn-close" aria-label="Remove" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })} style={{ position: 'absolute', top: -6, right: -6 }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted">Chưa có hình ảnh</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFileManager && (
        <FileManager
          isOpen={showFileManager}
          onClose={() => setShowFileManager(false)}
          onSelectFile={(url: string) => {
            setFormData(prev => ({ ...prev, images: Array.from(new Set([...(prev.images || []), url])) }));
            setShowFileManager(false);
          }}
          onSelectFiles={(urls: string[]) => {
            if (!urls || urls.length === 0) {
              toast.warning('Vui lòng chọn ít nhất một hình ảnh');
              return;
            }
            setFormData(prev => ({
              ...prev,
              images: Array.from(new Set([...(prev.images || []), ...urls])),
            }));
            setShowFileManager(false);
          }}
          accept="image/*"
          mode="image"
          multiSelect
          canManageFiles={isAdmin(currentUser?.roles)}
        />
      )}

      {showQuickView && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeQuickView}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Xem nhanh báo cáo</h5>
                <button type="button" className="btn-close" onClick={closeQuickView}></button>
              </div>
              <div className="modal-body">
                {quickViewLoading ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : !quickReport ? (
                  <div className="text-muted">Không tìm thấy dữ liệu.</div>
                ) : (
                  <div className="container-fluid" style={{ padding: '0.5rem 0 0.75rem' }}>
                    <div className="d-flex flex-column" style={{ gap: '16px' }}>
                      <div className="d-flex align-items-start justify-content-between" style={{ gap: '12px' }}>
                        <div>
                          <div className="fw-semibold" style={{ fontSize: '1.05rem', lineHeight: 1.25 }}>{quickReport.displayLocation || 'Không xác định'}</div>
                          <div className="text-muted" style={{ fontSize: '.85rem' }}>
                            Mã: #{quickReport.id} · Ngày báo cáo: {quickReport.reportDate ? format(new Date(quickReport.reportDate), 'dd/MM/yyyy') : '-'}
                          </div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap" style={{ justifyContent: 'flex-end' }}>
                          {getStatusBadge(quickReport.status)}
                          {getPriorityBadge(quickReport.priority)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '12px 16px',
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Người báo cáo</div>
                          <div style={{ fontSize: '.95rem', fontWeight: 500 }}>{quickReport.reporterName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Người xử lý</div>
                          <div style={{ fontSize: '.95rem', fontWeight: 500 }}>{quickReport.handlerName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngày bắt đầu xử lý</div>
                          <div style={{ fontSize: '.95rem', fontWeight: 500 }}>{quickReport.handlingDate ? format(new Date(quickReport.handlingDate), 'dd/MM/yyyy') : '-'}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngày hoàn thành</div>
                          <div style={{ fontSize: '.95rem', fontWeight: 500 }}>{quickReport.completedDate ? format(new Date(quickReport.completedDate), 'dd/MM/yyyy') : '-'}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '12px 14px',
                        }}
                      >
                        <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                          Nội dung hư hỏng
                        </div>
                        <div style={{ fontSize: '.95rem', lineHeight: 1.5 }}>{quickReport.damageContent || '-'}</div>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '12px 14px',
                        }}
                      >
                        <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                          Ghi chú người xử lý
                        </div>
                        <div style={{ fontSize: '.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: quickReport.handlerNotes ? '#212529' : '#6c757d' }}>
                          {quickReport.handlerNotes || 'Chưa có ghi chú'}
                        </div>
                      </div>

                      {quickReport.notes && (
                        <div
                          style={{
                            backgroundColor: '#fff',
                            border: '1px dashed #ced4da',
                            borderRadius: '8px',
                            padding: '12px 14px',
                          }}
                        >
                          <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            Ghi chú
                          </div>
                          <div style={{ fontSize: '.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{quickReport.notes}</div>
                        </div>
                      )}

                      {Array.isArray(quickReport.images) && quickReport.images.length > 0 && (
                        <div
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            padding: '12px 14px',
                          }}
                        >
                          <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            Hình ảnh
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                              gap: '10px',
                            }}
                          >
                            {quickReport.images.map((img, idx) => (
                              <div
                                key={`${img}-${idx}`}
                                onClick={() => {
                                  if (Array.isArray(quickReport.images) && quickReport.images.length > 0) {
                                    setSelectedImages(quickReport.images);
                                    setCurrentImageIndex(idx);
                                    setShowImageModal(true);
                                  }
                                }}
                                style={{
                                  position: 'relative',
                                  width: '100%',
                                  paddingBottom: '70%',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  border: '1px solid #dee2e6',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.03)';
                                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(33, 37, 41, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img}
                                  alt="img"
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeQuickView}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      {showExportModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Xuất Excel - Báo cáo hư hỏng</h5>
                <button type="button" className="btn-close" onClick={() => setShowExportModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Bộ phận báo cáo <span className="text-danger">*</span></label>
                    <select
                      className="form-control"
                      value={exportDepartment}
                      onChange={(e) => setExportDepartment(Number(e.target.value))}
                    >
                      <option value={0}>Tất cả bộ phận</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Từ ngày <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={exportFromDate}
                      onChange={(e) => setExportFromDate(e.target.value)}
                      max={exportToDate}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Đến ngày <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={exportToDate}
                      onChange={(e) => setExportToDate(e.target.value)}
                      min={exportFromDate}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
                  Hủy
                </button>
                <button type="button" className="btn btn-success" onClick={handleExportExcel}>
                  <i className="fas fa-file-excel me-2"></i>Xuất Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showImageModal && selectedImages.length > 0 && (
        <div 
          className="modal show d-block" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }} 
          tabIndex={-1}
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="d-flex align-items-center justify-content-center" 
            style={{ 
              width: '100%', 
              height: '100%',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              className="btn btn-link text-white"
              onClick={() => setShowImageModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '2rem',
                zIndex: 10000,
                textDecoration: 'none',
                opacity: 0.8,
                border: 'none',
                background: 'none',
                padding: '0.5rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Previous Button */}
            {selectedImages.length > 1 && (
              <button
                type="button"
                className="btn btn-link text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '2rem',
                  zIndex: 10000,
                  textDecoration: 'none',
                  opacity: 0.8,
                  border: 'none',
                  background: 'none',
                  padding: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}

            {/* Image Container */}
            <div 
              style={{ 
                maxWidth: '90%', 
                maxHeight: '90%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={selectedImages[currentImageIndex]}
                alt={`Hình ${currentImageIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}
              />
              
              {/* Image Counter */}
              {selectedImages.length > 1 && (
                <div 
                  className="text-white mt-3"
                  style={{
                    fontSize: '1rem',
                    fontWeight: '500',
                    opacity: 0.9
                  }}
                >
                  {currentImageIndex + 1} / {selectedImages.length}
                </div>
              )}
            </div>

            {/* Next Button */}
            {selectedImages.length > 1 && (
              <button
                type="button"
                className="btn btn-link text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '2rem',
                  zIndex: 10000,
                  textDecoration: 'none',
                  opacity: 0.8,
                  border: 'none',
                  background: 'none',
                  padding: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            )}

            {/* Thumbnail Navigation (for multiple images) */}
            {selectedImages.length > 1 && selectedImages.length <= 10 && (
              <div
                className="d-flex gap-2 justify-content-center"
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10000,
                  maxWidth: '90%',
                  overflowX: 'auto',
                  padding: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '8px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {selectedImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: idx === currentImageIndex ? '3px solid #fff' : '2px solid rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer',
                      opacity: idx === currentImageIndex ? 1 : 0.6,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (idx !== currentImageIndex) {
                        e.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (idx !== currentImageIndex) {
                        e.currentTarget.style.opacity = '0.6';
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  return __view;
}