'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '@/lib/utils/api';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { toast } from 'react-toastify';
import { DamageReportVM, DamageReportStatus, DamageReportPriority, DeviceVM, StaffVM, Department, DeviceCategory, EventType, DeviceStatus } from '@/types';
import { formatDateDisplay, formatDateInput, formatDateRange, formatDateFilename } from '@/lib/utils/dateFormat';
import FileManager from '@/components/FileManager';
import DateInput from '@/components/DateInput';
import { getDamageReportPermissions, isAdmin } from '@/lib/auth/permissions';
import QuickViewReportModal from '@/components/QuickViewReportModal';

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

  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editValue !== value && !isSaving) {
      setIsSaving(true);
      try {
        await onChange(editValue);
        setIsEditing(false);
      } catch (error) {
        // Error handled by parent
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
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
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="d-flex flex-column gap-2"
        style={{ width: '100%', minWidth: isCard ? '100%' : '220px' }}
      >
        <textarea
        ref={inputRef}
        className="form-control form-control-sm"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        disabled={isSaving}
        style={{
          fontSize: isCard ? '0.8rem' : '0.75rem',
          padding: isCard ? '0.5rem' : '0.25rem 0.5rem',
          minHeight: isCard ? '3rem' : '2.25rem',
          maxHeight: isCard ? '6rem' : '4rem',
          resize: 'vertical',
          width: '100%',
          minWidth: isCard ? '100%' : '200px',
          lineHeight: '1.5',
          pointerEvents: 'auto',
          marginBottom: '2px'
        }}
        />
        <div className="d-flex justify-content-end gap-2">
          <button 
            type="button"
            className="btn btn-primary btn-sm px-3" 
            onClick={handleSave}
            disabled={isSaving || editValue === value}
            style={{ 
              fontSize: '0.75rem', 
              height: '1.8rem', 
              display: 'flex', 
              alignItems: 'center',
              fontWeight: '500'
            }}
            title="Lưu (Ctrl+Enter)"
          >
            <i className="fas fa-save me-1"></i> Lưu
          </button>
          <button 
            type="button"
            className="btn btn-light btn-sm px-3 border" 
            onClick={handleCancel}
            disabled={isSaving}
            style={{ 
              fontSize: '0.75rem', 
              height: '1.8rem', 
              display: 'flex', 
              alignItems: 'center',
              fontWeight: '500',
              backgroundColor: '#fff'
            }}
            title="Hủy (Esc)"
          >
            <i className="fas fa-times me-1"></i> Hủy
          </button>
        </div>
      </div>
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
        fontSize: isCard ? '0.85rem' : '0.8rem',
        color: value ? '#212529' : '#adb5bd',
        fontStyle: 'normal',
        border: '1px solid transparent',
        borderRadius: '4px',
        transition: 'background-color 0.2s, border-color 0.2s',
        maxWidth: isCard ? '100%' : '250px',
        minWidth: isCard ? '100%' : '180px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.5',
        backgroundColor: 'transparent',
        pointerEvents: canEdit ? 'auto' : 'none',
        userSelect: 'text',
        opacity: 1
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

type CompletionModalState = {
  show: boolean;
  report: DamageReportVM | null;
  eventTypeId?: number;
  eventTitle: string;
  eventDescription: string;
  handlerNotes: string;
  deviceId?: number;
  afterImages: string[];
  submitting: boolean;
  finalDeviceStatus?: number;
  targetStatus: DamageReportStatus;
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
  const [fileManagerTarget, setFileManagerTarget] = useState<'images' | 'afterImages'>('images');

  // Export Excel modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDepartment, setExportDepartment] = useState(0);
  const [exportFromDate, setExportFromDate] = useState(formatDateInput(new Date(new Date().getFullYear(), 0, 1))); // Start of year
  const [exportToDate, setExportToDate] = useState(formatDateInput(new Date())); // Today
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [completionEventTypes, setCompletionEventTypes] = useState<EventType[]>([]);
  const [loadingCompletionTypes, setLoadingCompletionTypes] = useState(false);
  const [completionModalError, setCompletionModalError] = useState<string | null>(null);
  const [maintenanceBatches, setMaintenanceBatches] = useState<Array<{ batchId: string; title: string; nextDueDate: string | null; isCancelled?: boolean }>>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [showMaintenanceConfirmModal, setShowMaintenanceConfirmModal] = useState(false);
  const [pendingMaintenanceReport, setPendingMaintenanceReport] = useState<DamageReportVM | null>(null);
  const [completionModal, setCompletionModal] = useState<CompletionModalState>({
    show: false,
    report: null,
    eventTypeId: undefined,
    eventTitle: '',
    eventDescription: '',
    handlerNotes: '',
    deviceId: undefined,
    afterImages: [],
    submitting: false,
    finalDeviceStatus: DeviceStatus.DangSuDung,
    targetStatus: DamageReportStatus.Completed,
  });

  // Modal device filter state
  const [modalDeviceCategoryId, setModalDeviceCategoryId] = useState<number>(0);
  const [modalDeviceSearch, setModalDeviceSearch] = useState('');
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement | null>(null);

  // Modal category filter state
  const [modalCategorySearch, setModalCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Overflow menu state
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: 0,
    deviceId: undefined as number | undefined,
    damageLocation: '',
    deviceSelection: 'other' as 'device' | 'other' | 'maintenance', // 'device', 'other', or 'maintenance'
    reporterId: 0,
    reportingDepartmentId: 0,
    handlerId: undefined as number | undefined,
    assignedDate: '',
    reportDate: formatDateInput(new Date()),
    handlingDate: '',
    completedDate: '',
    estimatedCompletionDate: '',
    damageContent: '',
    images: [] as string[],
    afterImages: [] as string[],
    status: DamageReportStatus.Pending,
    priority: DamageReportPriority.Normal,
    notes: '',
    handlerNotes: '',
    rejectionReason: '',
    maintenanceBatchId: undefined as string | undefined,
  });
  const [isEdit, setIsEdit] = useState(false);

  // Quick view state
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedQuickReportId, setSelectedQuickReportId] = useState<number | null>(null);

  const cardBodyStyle = useMemo(() => {
    return {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      padding: 0,
      backgroundColor: '#f5f5f5',
    };
  }, []);

  const filteredModalCategories = useMemo(() => {
    if (!modalCategorySearch.trim()) return deviceCategories;
    const keyword = modalCategorySearch.trim().toLowerCase();
    return deviceCategories.filter(cate => cate.name.toLowerCase().includes(keyword));
  }, [deviceCategories, modalCategorySearch]);

  const filteredModalDevices = useMemo(() => {
    let list = devices;

    if (modalDeviceCategoryId > 0) {
      list = list.filter((device) => device.deviceCategoryId === modalDeviceCategoryId);
    }

    if (modalDeviceSearch.trim()) {
      const keyword = modalDeviceSearch.trim().toLowerCase();
      list = list.filter((device) => {
        const source = `${device.name || ''} ${device.serial || ''} ${device.deviceCategoryName || ''} ${device.locationName || ''}`.toLowerCase();
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
      setModalCategorySearch('');
      setIsDeviceDropdownOpen(false);
      setIsCategoryDropdownOpen(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleClickOutside = (event: MouseEvent) => {
      // Handle device dropdown
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
      // Handle category dropdown
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      // Handle overflow menu
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(event.target as Node)) {
        setIsOverflowMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const openQuickView = (reportId: number) => {
    setSelectedQuickReportId(reportId);
    setShowQuickView(true);
  };

  const headerStyle = `
    .dashboard-table-header th {
      background-color: #2c3e50 !important;
      color: #ffffff !important;
      border-color: #34495e !important;
      transition: background-color 0.2s;
    }
    .dashboard-table-header th:hover {
      background-color: #23313f !important;
      color: #ffffff !important;
    }
    .dashboard-table-header th .text-info {
      color: #0dcaf0 !important;
    }
    .dashboard-table-header th .fas {
      color: rgba(255, 255, 255, 0.7) !important;
    }
    
    /* MOBILE-ONLY STICKY LAYOUT */
    @media (max-width: 767.98px) {
      .mobile-sticky-container {
        height: calc(100dvh - 65px) !important;
        display: flex !important;
        flex-direction: column !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow: hidden !important;
      }
      .mobile-sticky-card {
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        border-radius: 0 !important;
        margin: 0 !important;
        flex: 1 !important;
        box-shadow: none !important;
      }
      .mobile-sticky-body {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        padding: 0 !important;
      }
      .mobile-sticky-footer {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 100 !important;
        padding-bottom: env(safe-area-inset-bottom, 8px) !important;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
      }
    }
    .dashboard-table-header th .text-info.fas {
      color: #0dcaf0 !important;
      opacity: 1 !important;
    }
    .table-scroll-hint {
      display: block;
    }
    @media (min-width: 1240px) {
      .table-scroll-hint {
        display: none !important;
      }
    }
    .table-bordered td, .table-bordered th {
      padding: 0.3rem 0.4rem !important;
      vertical-align: middle !important;
    }

    /* MODERN CARD STYLES */
    .modern-status-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
      border-color: #3b82f6 !important;
    }
    
    .scrollbar-thin::-webkit-scrollbar {
      height: 4px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `;

  const closeQuickView = () => {
    setShowQuickView(false);
    setSelectedQuickReportId(null);
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
            if (!isAdmin(user?.roles)) {
              setMyWorkFilter(true);
            }
          }
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }

      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 768;
        setViewMode(isMobile ? 'card' : 'table');

        // Note: Removing the auto-switch on resize to prevent the virtual keyboard 
        // from resetting the view mode when editing notes on mobile.
        // The user can still manualy switch using the header buttons.
      }
      return () => { };
    };

    const cleanup = init();
    return cleanup;
  }, []);

  // Use SWR for real-time polling of reports
  const currentParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedStatus > 0) params.append('status', selectedStatus.toString());
    if (selectedPriority > 0) params.append('priority', selectedPriority.toString());
    if (selectedDevice > 0) params.append('deviceId', selectedDevice.toString());
    if (selectedDepartment > 0) params.append('departmentId', selectedDepartment.toString());
    return params.toString();
  }, [selectedStatus, selectedPriority, selectedDevice, selectedDepartment]);

  const { data: reportsResponse, isLoading: reportsLoading, mutate } = useSWR(
    `/damage-reports?${currentParams}`, 
    fetcher, 
    { refreshInterval: 10000 }
  );

  // Update allReports when SWR data changes
  useEffect(() => {
    if (reportsResponse?.status) {
      setAllReports(reportsResponse.data || []);
    }
  }, [reportsResponse]);

  // Rest of the data loading (can be moved to SWR later if needed, but keeping simple for now)
  useEffect(() => {
    loadDevices();
    loadDeviceCategories();
    loadStaff();
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use the loading state from SWR for reports
  useEffect(() => {
    setLoading(reportsLoading);
  }, [reportsLoading]);

  const loadData = async () => {
    mutate();
    globalMutate('/reports/pending');
  };

  const loadDevices = async () => {
    try {
      const response = await api.get('/devices?limit=9999');
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

  const loadMaintenanceBatches = async () => {
    try {
      setLoadingBatches(true);
      const response = await api.get('/events/maintenance-batches?all=true');
      if (response.data.status) {
        const batches = (response.data.data || []).map((batch: any) => ({
          batchId: String(batch.batchId),
          title: batch.title || `Batch ${batch.batchId}`,
          nextDueDate: batch.nextDueDate || null,
          isCancelled: batch.isCancelled || false,
        }));
        setMaintenanceBatches(batches);
      }
    } catch (error) {
      console.error('Error loading maintenance batches:', error);
      // Don't show error toast, just log it - batches are optional
    } finally {
      setLoadingBatches(false);
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
  }, [
    selectedStatus,
    selectedPriority,
    selectedDevice,
    selectedDepartment
  ]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchKeyword(searchInputValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

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

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter((report) => {
        const idMatch = report.id ? String(report.id).includes(keyword) : false;
        const candidates = [
          report.displayLocation,
          report.damageContent,
          report.notes,
          report.handlerNotes,
          report.reporterName,
          report.handlerName,
          report.reporterDepartmentName,
          report.handlerDepartmentName,
          report.deviceName,
          report.deviceSerial,
        ];
        const textMatch = candidates.some(
          (value) => value && value.toLowerCase().includes(keyword)
        );
        return idMatch || textMatch;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'id':
          aValue = a.id || 0;
          bValue = b.id || 0;
          break;
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
        case 'damageContent':
          aValue = a.damageContent || '';
          bValue = b.damageContent || '';
          break;
        case 'reporterName':
          aValue = a.reporterName || '';
          bValue = b.reporterName || '';
          break;
        case 'handlerName':
          aValue = a.handlerName || '';
          bValue = b.handlerName || '';
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
  }, [allReports, sortField, sortDirection, myWorkFilter, myReportFilter, currentUserStaffId, searchKeyword]);

  const handleNew = async () => {
    // Get current user's staff info
    const currentStaff = currentUserStaffId ? staff.find(s => s.id === currentUserStaffId) : null;
    const today = formatDateInput(new Date());

    setFormData({
      id: 0,
      deviceId: undefined,
      damageLocation: '',
      deviceSelection: 'other',
      reporterId: currentUserStaffId || 0,
      reportingDepartmentId: currentStaff?.departmentId || 0,
      handlerId: undefined,
      assignedDate: '',
      reportDate: today,
      handlingDate: '',
      completedDate: '',
      estimatedCompletionDate: '',
      damageContent: '',
      images: [],
      afterImages: [],
      status: DamageReportStatus.Pending,
      priority: DamageReportPriority.Normal,
      notes: '',
      handlerNotes: '',
      rejectionReason: '',
      maintenanceBatchId: undefined,
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
      // Load maintenance batches for edit
      await loadMaintenanceBatches();

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

      // Convert dates properly - use utility function
      const formatDate = (dateStr: any) => {
        if (!dateStr) return '';
        try {
          const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
          if (isNaN(date.getTime())) return '';
          return formatDateInput(date);
        } catch {
          return '';
        }
      };

      // Determine deviceSelection based on maintenanceBatchId and deviceId
      let deviceSelection: 'device' | 'other' | 'maintenance' = 'other';
      if (selectedReport.maintenanceBatchId) {
        deviceSelection = 'maintenance';
      } else if (isDevice) {
        deviceSelection = 'device';
      }

      const formDataToSet = {
        id: selectedReport.id,
        deviceId: isDevice && selectedReport.deviceId ? Number(selectedReport.deviceId) : undefined,
        damageLocation: selectedReport.damageLocation || '',
        deviceSelection: deviceSelection,
        reporterId: Number(selectedReport.reporterId) || 0,
        reportingDepartmentId: Number(selectedReport.reportingDepartmentId) || 0,
        handlerId: selectedReport.handlerId ? Number(selectedReport.handlerId) : undefined,
        assignedDate: formatDate(selectedReport.assignedDate),
        reportDate: formatDate(selectedReport.reportDate) || formatDateInput(new Date()),
        handlingDate: formatDate(selectedReport.handlingDate),
        completedDate: formatDate(selectedReport.completedDate),
        estimatedCompletionDate: formatDate(selectedReport.estimatedCompletionDate),
        damageContent: selectedReport.damageContent || '',
        images: Array.isArray(selectedReport.images) ? selectedReport.images : (selectedReport.images ? (typeof selectedReport.images === 'string' ? JSON.parse(selectedReport.images) : []) : []),
        afterImages: Array.isArray(selectedReport.afterImages) ? selectedReport.afterImages : (selectedReport.afterImages ? (typeof selectedReport.afterImages === 'string' ? JSON.parse(selectedReport.afterImages) : []) : []),
        status: Number(selectedReport.status) || DamageReportStatus.Pending,
        priority: Number(selectedReport.priority) || DamageReportPriority.Normal,
        notes: selectedReport.notes || '',
        handlerNotes: selectedReport.handlerNotes || '',
        rejectionReason: selectedReport.rejectionReason || '',
        maintenanceBatchId: selectedReport.maintenanceBatchId || undefined,
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

  const handleSave = async (shouldOpenCompletion = false) => {
    // Validation
    if (formData.deviceSelection === 'device' && !formData.deviceId) {
      toast.error('Vui lòng chọn thiết bị');
      return;
    }
    if (formData.deviceSelection === 'other' && !formData.damageLocation?.trim()) {
      toast.error('Vui lòng nhập vị trí công việc');
      return;
    }
    if (formData.deviceSelection === 'maintenance') {
      if (!formData.maintenanceBatchId) {
        toast.error('Vui lòng chọn đợt bảo trì');
        return;
      }

      const batch = maintenanceBatches.find(b => b.batchId === formData.maintenanceBatchId);
      if (batch && batch.nextDueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(batch.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);

        // If not due and this is a NEW report (not editing an existing valid selection)
        if (dueDate > today && !isEdit) {
          toast.error(`Đợt bảo trì này chưa tới hạn (Đến hạn ngày: ${formatDateDisplay(batch.nextDueDate)})`);
          return;
        }
      }
    }
    if (!formData.damageContent?.trim()) {
      toast.error('Vui lòng nhập nội dung công việc');
      return;
    }
    if (!formData.reporterId) {
      toast.error('Vui lòng chọn người báo cáo');
      return;
    }
    if (!formData.handlerId) {
      toast.error('Vui lòng chọn người xử lý');
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
        handlingDate: shouldOpenCompletion ? formData.reportDate : (formData.handlingDate || null),
        completedDate: shouldOpenCompletion ? formData.reportDate : (formData.completedDate || null),
        estimatedCompletionDate: formData.estimatedCompletionDate || null,
        damageContent: formData.damageContent.trim(),
        images: formData.images.length > 0 ? formData.images : null,
        afterImages: formData.afterImages.length > 0 ? formData.afterImages : null,
        status: (shouldOpenCompletion && formData.deviceSelection === 'other') ? DamageReportStatus.Completed : formData.status,
        priority: formData.priority,
        notes: null, // Bỏ ghi chú chung
        handlerNotes: formData.handlerNotes || null,
        rejectionReason: formData.rejectionReason || null,
        maintenanceBatchId: formData.maintenanceBatchId || null,
      };

      // Date Consistency Logic
      const status = Number(formData.status);
      if (status === DamageReportStatus.Completed) {
        if (!payload.completedDate) {
          toast.error('Vui lòng chọn ngày hoàn thành khi báo cáo đã hoàn tất');
          return;
        }
        // Auto-fix: Ensure Handling Date exists and is not after Completed Date
        if (!payload.handlingDate) {
          payload.handlingDate = payload.reportDate;
        }
        if (new Date(payload.handlingDate) > new Date(payload.completedDate)) {
          payload.handlingDate = payload.completedDate;
        }
      }

      // DB Constraint: Report Date <= Handling Date
      if (payload.handlingDate && new Date(payload.reportDate) > new Date(payload.handlingDate)) {
        toast.error('Ngày báo cáo không thể sau ngày xử lý');
        return;
      }
      
      // DB Constraint: Handling Date <= Completed Date
      if (payload.handlingDate && payload.completedDate && new Date(payload.handlingDate) > new Date(payload.completedDate)) {
        toast.error('Ngày xử lý không thể sau ngày hoàn thành');
        return;
      }

      let savedReport: DamageReportVM;
      if (isEdit) {
        const response = await api.put(`/damage-reports/${formData.id}`, { ...payload, id: formData.id });
        savedReport = response.data.data;
        toast.success('Cập nhật thành công');
      } else {
        const response = await api.post('/damage-reports', payload);
        savedReport = response.data.data;
        toast.success('Thêm mới thành công');
      }

      setShowModal(false);
      loadData();

      // If requested, open completion modal for the saved report
      if (shouldOpenCompletion && savedReport) {
        // Enriched report details for completion modals
        const currentDeviceId = savedReport.deviceId || formData.deviceId;
        const device = devices.find(d => d.id === currentDeviceId);
        
        const enrichedReport: DamageReportVM = {
          ...savedReport,
          deviceId: currentDeviceId,
          deviceName: savedReport.deviceName || device?.name,
          displayLocation: savedReport.displayLocation || (device?.name || savedReport.damageLocation || formData.damageLocation),
          damageContent: savedReport.damageContent || formData.damageContent,
          handlerNotes: savedReport.handlerNotes || formData.handlerNotes,
        };

        if (formData.deviceSelection === 'maintenance') {
          // Streamlined maintenance completion (per user request)
          executeMaintenanceBatchCompletion(enrichedReport);
        } else if (formData.deviceSelection !== 'other') {
          // Standard device-style completion modal
          setTimeout(() => {
            openStatusUpdateModal(enrichedReport, DamageReportStatus.Completed);
          }, 300);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || (isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới'));
    }
  };

  const handleImageSelect = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, url.trim()]
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
  const startIndex = viewMode === 'card' ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = viewMode === 'card' ? currentPage * itemsPerPage : startIndex + itemsPerPage;
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
      return <i className="fas fa-sort" style={{ fontSize: '0.8rem', opacity: 0.5, color: '#ffffff' }}></i>;
    }
    return sortDirection === 'asc'
      ? <i className="fas fa-sort-up text-info"></i>
      : <i className="fas fa-sort-down text-info"></i>;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
      [DamageReportStatus.Pending]: { color: '#64748b', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', tint: '#f8fafc' },
      [DamageReportStatus.Assigned]: { color: '#0369a1', backgroundColor: '#e0f2fe', borderColor: '#7dd3fc', tint: '#f0f9ff' },
      [DamageReportStatus.InProgress]: { color: '#1d4ed8', backgroundColor: '#dbeafe', borderColor: '#93c5fd', tint: '#eff6ff' },
      [DamageReportStatus.Completed]: { color: '#15803d', backgroundColor: '#dcfce7', borderColor: '#86efac', tint: '#f0fdf4' },
      [DamageReportStatus.Cancelled]: { color: '#374151', backgroundColor: '#f3f4f6', borderColor: '#d1d5db', tint: '#f9fafb' },
      [DamageReportStatus.Rejected]: { color: '#b91c1c', backgroundColor: '#fee2e2', borderColor: '#fca5a5', tint: '#fef2f2' },
    };
    return statusMap[status] || { color: '#64748b', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', tint: '#f8fafc' };
  };

  const getStatusLabel = (status: DamageReportStatus) => {
    const labelMap = {
      [DamageReportStatus.Pending]: 'Chờ xử lý',
      [DamageReportStatus.Assigned]: 'Đã phân công',
      [DamageReportStatus.InProgress]: 'Đang xử lý',
      [DamageReportStatus.Completed]: 'Hoàn thành',
      [DamageReportStatus.Cancelled]: 'Đã hủy',
      [DamageReportStatus.Rejected]: 'Từ chối',
    };
    return labelMap[status] || 'N/A';
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
      [DamageReportPriority.Low]: { color: '#64748b', backgroundColor: '#f8fafc', borderColor: 'transparent' },
      [DamageReportPriority.Normal]: { color: '#2563eb', backgroundColor: '#eff6ff', borderColor: 'transparent' },
      [DamageReportPriority.High]: { color: '#a16207', backgroundColor: '#fefce8', borderColor: 'transparent' },
      [DamageReportPriority.Urgent]: { color: '#be123c', backgroundColor: '#fff1f2', borderColor: 'transparent' },
    };
    return priorityMap[priority] || { color: '#64748b', backgroundColor: '#f8fafc', borderColor: 'transparent' };
  };

  const canUpdateStatusForReport = (report?: DamageReportVM | null): boolean => {
    if (!report) return false;
    if (!userPermissions.canUpdateStatus) return false;
    
    // Admin has full control over all states
    if (isAdmin(currentUser?.roles)) return true;

    // For non-admin (User/Handler)
    if (currentUserStaffId === null) return false;
    // Must be the assigned handler to update status
    if (report.handlerId !== currentUserStaffId) return false;
    
    // User can move forward from Pending or InProgress
    // Once it reaches Completed, Rejected or Cancelled, it's locked for User.
    return report.status === DamageReportStatus.Pending || report.status === DamageReportStatus.InProgress;
  };

  const resetCompletionModal = () => {
    setCompletionModal({
      show: false,
      report: null,
      eventTypeId: undefined,
      eventTitle: '',
      eventDescription: '',
      handlerNotes: '',
      deviceId: undefined,
      afterImages: [],
      submitting: false,
      finalDeviceStatus: DeviceStatus.DangSuDung,
      targetStatus: DamageReportStatus.Completed,
    });
    setCompletionModalError(null);
  };

  const loadCompletionEventTypes = async (): Promise<EventType[]> => {
    if (completionEventTypes.length > 0) {
      return completionEventTypes;
    }
    try {
      setLoadingCompletionTypes(true);
      const response = await api.get('/event-types');
      if (response.data.status) {
        const list: EventType[] = response.data.data || [];
        const filtered = list.filter((type) => !type.isReminder);
        setCompletionEventTypes(filtered);
        return filtered;
      }
      return [];
    } catch (error) {
      console.error('Error loading completion event types:', error);
      toast.error('Không thể tải danh sách loại sự kiện');
      return [];
    } finally {
      setLoadingCompletionTypes(false);
    }
  };

  const openStatusUpdateModal = async (report: DamageReportVM, targetStatus: DamageReportStatus) => {
    if (targetStatus === DamageReportStatus.Completed) {
      await loadCompletionEventTypes();
    }
    
    setCompletionModal({
      show: true,
      report,
      eventTypeId: undefined,
      eventTitle: targetStatus === DamageReportStatus.Completed
        ? (report.deviceName ? `Hoàn thành xử lý - ${report.deviceName}` : 'Hoàn thành xử lý công việc')
        : targetStatus === DamageReportStatus.Cancelled
          ? `Hủy báo cáo - ${report.deviceName || 'Mô tả chung'}`
          : `Từ chối báo cáo - ${report.deviceName || 'Mô tả chung'}`,
      eventDescription: report.handlerNotes || report.damageContent || '',
      handlerNotes: report.handlerNotes || '',
      deviceId: report.deviceId,
      afterImages: report.afterImages || [],
      submitting: false,
      finalDeviceStatus: DeviceStatus.DangSuDung,
      targetStatus,
    });
    setCompletionModalError(null);
  };

  const handleStatusChange = async (reportId: number, newStatus: DamageReportStatus) => {
    const report = allReports.find((r) => r.id === reportId) || reports.find((r) => r.id === reportId);

    if (!canUpdateStatusForReport(report)) {
      toast.error('Bạn chỉ có thể cập nhật trạng thái khi là người xử lý báo cáo này');
      return;
    }

    if (!report) {
      toast.error('Không tìm thấy báo cáo');
      return;
    }

    // If completing a maintenance report, show confirmation dialog
    if (newStatus === DamageReportStatus.Completed && report?.maintenanceBatchId) {
      setPendingMaintenanceReport(report);
      setShowMaintenanceConfirmModal(true);
      return;
    }

    // Capture device status for terminal states
    if ((newStatus === DamageReportStatus.Completed || 
         newStatus === DamageReportStatus.Cancelled || 
         newStatus === DamageReportStatus.Rejected) && report?.deviceId) {
      await openStatusUpdateModal(report, newStatus);
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

  const updateCompletionModal = (patch: Partial<CompletionModalState>) => {
    setCompletionModal((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const executeMaintenanceBatchCompletion = async (report: DamageReportVM) => {
    if (!report || !report.maintenanceBatchId) {
      return;
    }

    try {
      // Load event types to find maintenance type - wait for results to avoid race condition
      const types = await loadCompletionEventTypes();
      const maintenanceEventType = types.find(
        (type) => type.category === 'maintenance' || 
                 type.name?.toLowerCase().includes('bảo trì') ||
                 type.code?.toLowerCase().includes('maintenance')
      );

      if (!maintenanceEventType) {
        toast.error('Không tìm thấy loại sự kiện bảo trì. Vui lòng liên hệ quản trị viên.');
        return;
      }

      // Get maintenance batch details to find context
      const batchResponse = await api.get(`/events/maintenance-batches?all=true`);
      if (!batchResponse.data.status) {
        throw new Error('Không thể tải thông tin đợt bảo trì');
      }

      const batch = batchResponse.data.data.find(
        (b: any) => b.batchId === report.maintenanceBatchId
      );

      // Complete the damage report with maintenance event type
      const payload: any = {
        status: DamageReportStatus.Completed,
        eventTypeId: maintenanceEventType.id,
        eventTitle: `Bảo trì định kỳ - ${batch?.title || report.maintenanceBatchId}`,
        eventDescription: report.handlerNotes || report.damageContent || '',
        eventDeviceId: report.deviceId || null,
        afterImages: report.afterImages?.length ? report.afterImages : (formData.afterImages?.length ? formData.afterImages : null),
        handlerNotes: report.handlerNotes || formData.handlerNotes || null,
      };

      const response = await api.put(`/damage-reports/${report.id}/status`, payload);

      if (response.data.status) {
        toast.success('Đã hoàn thành bảo trì và đồng bộ lên hệ thống');
        loadData();
        return true;
      } else {
        throw new Error(response.data.error || 'Lỗi khi hoàn thành bảo trì');
      }
    } catch (error: any) {
      console.error('Error executing maintenance completion:', error);
      toast.error(error.response?.data?.error || error.message || 'Lỗi khi hoàn thành bảo trì');
      return false;
    }
  };

  const handleMaintenanceCompletion = async () => {
    if (!pendingMaintenanceReport) return;
    const success = await executeMaintenanceBatchCompletion(pendingMaintenanceReport);
    if (success) {
      setShowMaintenanceConfirmModal(false);
      setPendingMaintenanceReport(null);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completionModal.report) {
      return;
    }

    const { targetStatus } = completionModal;

    // Validation for Completed status
    if (targetStatus === DamageReportStatus.Completed) {
      if (!completionModal.eventTypeId) {
        setCompletionModalError('Vui lòng chọn loại xử lý');
        return;
      }

      const deviceId = completionModal.deviceId || completionModal.report.deviceId;
      if (!deviceId) {
        setCompletionModalError('Báo cáo chưa gắn thiết bị, vui lòng chọn thiết bị để tạo sự kiện');
        return;
      }
    }

    setCompletionModalError(null);
    updateCompletionModal({ submitting: true });

    try {
      const payload: any = {
        status: targetStatus,
        finalDeviceStatus: completionModal.finalDeviceStatus,
      };

      if (targetStatus === DamageReportStatus.Completed) {
        payload.eventTypeId = completionModal.eventTypeId;
        payload.eventTitle = completionModal.eventTitle?.trim() || null;
        payload.eventDescription = completionModal.eventDescription?.trim() || null;
        payload.eventDeviceId = completionModal.deviceId || completionModal.report.deviceId;
        payload.afterImages = completionModal.afterImages.length > 0 ? completionModal.afterImages : null;
      }

      const trimmedHandlerNotes = completionModal.handlerNotes?.trim() ?? '';
      const originalHandlerNotes = completionModal.report.handlerNotes?.trim() ?? '';
      if (trimmedHandlerNotes !== originalHandlerNotes) {
        payload.handlerNotes = trimmedHandlerNotes;
      }

      const response = await api.put(`/damage-reports/${completionModal.report.id}/status`, payload);
      if (response.data.status) {
        toast.success('Cập nhật trạng thái thành công');
        resetCompletionModal();
        loadData();
      } else {
        const errorMessage = response.data.error || 'Lỗi khi cập nhật trạng thái';
        setCompletionModalError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi cập nhật trạng thái';
      setCompletionModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      updateCompletionModal({ submitting: false });
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
        const dateRange = formatDateRange(fromDate, toDate);
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
      let fileName = `BaoCao_${formatDateFilename(fromDate)}_${formatDateFilename(toDate)}.xlsx`;

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


  const __view = (
    <div className="container-fluid mobile-sticky-container px-md-1 pb-md-3 pt-md-0">
      <style>{headerStyle}</style>
      <div className="card mobile-sticky-card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header border-bottom sticky-top bg-white" style={{ padding: '0.75rem', zIndex: 10 }}>
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap" style={{ gap: '0.5rem' }}>
            <h4 className="mb-0" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', whiteSpace: 'nowrap' }}>CÔNG VIỆC</h4>
            <div className="d-flex gap-1 align-items-center flex-wrap" style={{ justifyContent: 'flex-end' }}>
              {/* Reload - đầu tiên */}
              <button
                className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center"
                onClick={() => {
                  setSearchKeyword('');
                  setSearchInputValue('');
                  setSelectedStatus(0);
                  setSelectedPriority(0);
                  setSelectedDepartment(0);
                  setSelectedDevice(0);
                  if (!isAdmin(currentUser?.roles)) {
                    setMyWorkFilter(true);
                    setMyReportFilter(false);
                  } else {
                    setMyWorkFilter(false);
                    setMyReportFilter(false);
                  }
                  setCurrentPage(1);
                  loadData();
                  toast.success('Đã tải lại dữ liệu và xóa bộ lọc');
                }}
                title="Tải lại dữ liệu"
                style={{ width: '36px', height: '36px', borderRadius: '8px', padding: 0 }}
              >
                <i className="fas fa-sync-alt" style={{ fontSize: '0.8rem' }}></i>
              </button>

              {/* Filter toggle - mobile only */}
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-md-none d-flex align-items-center justify-content-center"
                onClick={() => setFiltersOpen((s) => !s)}
                aria-pressed={!filtersOpen}
                title={filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
              >
                <i className={`fas ${filtersOpen ? 'fa-chevron-up' : 'fa-filter'}`} style={{ fontSize: '0.8rem' }}></i>
              </button>

              {/* My Work / My Report toggles */}
              {currentUserStaffId !== null && (
                <>
                  <button
                    className={`btn btn-sm d-flex align-items-center justify-content-center ${myWorkFilter ? 'btn-info' : 'btn-outline-info'}`}
                    onClick={() => {
                      skipPageResetOnMyWorkToggle.current = true;
                      setMyWorkFilter(!myWorkFilter);
                      if (!myWorkFilter) setMyReportFilter(false);
                    }}
                    title="Lọc công việc của tôi"
                    style={{ width: '36px', height: '36px', borderRadius: '8px', padding: 0 }}
                  >
                    <i className="fas fa-user-tie" style={{ fontSize: '0.8rem' }}></i>
                  </button>
                  <button
                    className={`btn btn-sm d-flex align-items-center justify-content-center ${myReportFilter ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => {
                      skipPageResetOnMyReportToggle.current = true;
                      setMyReportFilter(!myReportFilter);
                      if (!myReportFilter) setMyWorkFilter(false);
                    }}
                    title="Lọc báo cáo của tôi"
                    style={{ width: '36px', height: '36px', borderRadius: '8px', padding: 0 }}
                  >
                    <i className="fas fa-file-alt" style={{ fontSize: '0.8rem' }}></i>
                  </button>
                </>
              )}

              <div className="ms-md-1 d-flex gap-1 align-items-center">
                {/* Secondary actions */}
                {(isAdmin(currentUser?.roles) || userPermissions.canEdit || userPermissions.canDelete) && (
                  <div ref={overflowMenuRef} style={{ position: 'relative' }}>
                    {/* Desktop: nút inline riêng lẻ */}
                    <div className="d-none d-md-flex gap-1 align-items-center">
                      {isAdmin(currentUser?.roles) && (
                        <button
                          className="btn btn-success btn-sm d-flex align-items-center justify-content-center"
                          onClick={handleOpenExportModal}
                          title="Xuất Excel"
                          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                        >
                          <i className="fas fa-file-excel" style={{ fontSize: '0.8rem' }}></i>
                        </button>
                      )}
                      {userPermissions.canEdit && (
                        <button
                          className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center"
                          onClick={handleEdit}
                          title="Sửa"
                          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                        >
                          <i className="fas fa-edit" style={{ fontSize: '0.8rem' }}></i>
                        </button>
                      )}
                      {userPermissions.canDelete && (
                        <button
                          className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                          onClick={handleDelete}
                          title="Xóa"
                          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                        >
                          <i className="fas fa-trash" style={{ fontSize: '0.8rem' }}></i>
                        </button>
                      )}
                    </div>
                    {/* Mobile: dropdown ⋮ */}
                    <div className="d-md-none">
                      <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center"
                        onClick={() => setIsOverflowMenuOpen(prev => !prev)}
                        title="Thêm hành động"
                        style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                      >
                        <i className="fas fa-ellipsis-v" style={{ fontSize: '0.85rem' }}></i>
                      </button>
                      {isOverflowMenuOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '42px',
                          right: 0,
                          zIndex: 1050,
                          backgroundColor: '#fff',
                          borderRadius: '10px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          border: '1px solid #e2e8f0',
                          minWidth: '170px',
                          overflow: 'hidden'
                        }}>
                          {isAdmin(currentUser?.roles) && (
                            <button
                              className="d-flex align-items-center gap-2 w-100 border-0 bg-transparent text-start py-3 px-3"
                              style={{ fontSize: '0.85rem', cursor: 'pointer' }}
                              onClick={() => { handleOpenExportModal(); setIsOverflowMenuOpen(false); }}
                            >
                              <i className="fas fa-file-excel text-success" style={{ width: '16px' }}></i>
                              Xuất Excel
                            </button>
                          )}
                          {userPermissions.canEdit && (
                            <button
                              className="d-flex align-items-center gap-2 w-100 border-0 bg-transparent text-start py-3 px-3"
                              style={{ fontSize: '0.85rem', cursor: 'pointer' }}
                              onClick={() => { handleEdit(); setIsOverflowMenuOpen(false); }}
                            >
                              <i className="fas fa-edit text-primary" style={{ width: '16px' }}></i>
                              Sửa báo cáo
                            </button>
                          )}
                          {userPermissions.canDelete && (
                            <button
                              className="d-flex align-items-center gap-2 w-100 border-0 bg-transparent text-start py-3 px-3"
                              style={{ fontSize: '0.85rem', cursor: 'pointer', color: '#dc3545' }}
                              onClick={() => { handleDelete(); setIsOverflowMenuOpen(false); }}
                            >
                              <i className="fas fa-trash" style={{ width: '16px' }}></i>
                              Xóa báo cáo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Thêm mới - luôn cuối cùng */}
                <button
                  className="btn btn-primary btn-sm d-flex align-items-center justify-content-center"
                  onClick={handleNew}
                  title="Thêm mới"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                >
                  <i className="fas fa-plus" style={{ fontSize: '0.85rem' }}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className={`card mb-2 filter-card ${filtersOpen ? 'filter-open' : 'filter-collapsed'}`} style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <div className="card-body py-2 px-2 px-md-3">
              <div className="row g-2 align-items-center">
                {/* Status Filter */}
                <div className="col-12 col-sm-6 col-md-auto">
                  <div className="row g-2 align-items-center">
                    <div className="col-auto" style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Trạng thái:</span>
                    </div>
                    <div className="col">
                      <select
                        className="form-select form-select-sm"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(Number(e.target.value) as DamageReportStatus | 0)}
                        style={{ borderRadius: '6px' }}
                      >
                        <option value="0">Tất cả</option>
                        <option value={DamageReportStatus.Pending}>Chờ xử lý</option>
                        <option value={DamageReportStatus.InProgress}>Đang xử lý</option>
                        <option value={DamageReportStatus.Completed}>Hoàn thành</option>
                        <option value={DamageReportStatus.Cancelled}>Đã hủy</option>
                        <option value={DamageReportStatus.Rejected}>Từ chối</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Priority Filter */}
                <div className="col-12 col-sm-6 col-md-auto">
                  <div className="row g-2 align-items-center">
                    <div className="col-auto" style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Ưu tiên:</span>
                    </div>
                    <div className="col">
                      <select
                        className="form-select form-select-sm"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(Number(e.target.value) as DamageReportPriority | 0)}
                        style={{ borderRadius: '6px' }}
                      >
                        <option value="0">Tất cả</option>
                        <option value={DamageReportPriority.Low}>Thấp</option>
                        <option value={DamageReportPriority.Normal}>Bình thường</option>
                        <option value={DamageReportPriority.High}>Cao</option>
                        <option value={DamageReportPriority.Urgent}>Khẩn cấp</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Department Filter */}
                <div className="col-12 col-md-auto">
                  <div className="row g-2 align-items-center">
                    <div className="col-auto" style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Phòng ban:</span>
                    </div>
                    <div className="col">
                      <select
                        className="form-select form-select-sm"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(Number(e.target.value))}
                        style={{ borderRadius: '6px' }}
                      >
                        <option value="0">Tất cả</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="col-12 col-md">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="fas fa-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Tìm kiếm nội dung, thiết bị..."
                      value={searchInputValue}
                      onChange={(e) => setSearchInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSearchKeyword(searchInputValue);
                        }
                      }}
                    />

                    <button
                      className="btn btn-outline-danger"
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
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
              <div className="d-flex align-items-center gap-1" style={{ flexWrap: 'nowrap' }}>
                <span style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Hiện:</span>
                <select
                  className="form-control form-control-sm"
                  style={{ width: '55px', padding: '0.2rem 0.35rem', fontSize: '0.8rem' }}
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div className="btn-group btn-group-sm ms-1">
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary shadow-sm' : 'btn-white border'}`}
                  onClick={() => setViewMode('table')}
                  title="Xem dạng bảng"
                >
                  <i className="fas fa-list"></i>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'card' ? 'btn-primary shadow-sm' : 'btn-white border'}`}
                  onClick={() => setViewMode('card')}
                  title="Xem dạng thẻ"
                >
                  <i className="fas fa-th-large"></i>
                </button>
              </div>
            </div>
            <div style={{ flexShrink: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: '#6c757d' }}>
                Hiển thị {startIndex + 1}-{Math.min(endIndex, reports.length)} của {reports.length}
              </span>
            </div>
          </div>
        </div>
        <div className="card-body mobile-sticky-body" style={{ padding: viewMode === 'table' ? 0 : '1rem' }}>
          {/* Table View */}
          {viewMode === 'table' && (
            <div
              className="flex-grow-1 d-flex flex-column"
              style={{
                overflow: 'hidden',
                height: '100%',
                backgroundColor: '#fff'
              }}
            >
              <div className="table-scroll-hint d-md-none text-center py-1 small text-muted border-bottom bg-light">
                <i className="fas fa-arrows-alt-h me-1"></i> Vuốt sang để xem thêm
              </div>
              <div
                className="table-responsive flex-grow-1"
                id="damage-reports-table-responsive"
                style={{
                  overflow: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  position: 'relative'
                }}
              >
                <table className="table table-bordered table-hover table-striped align-middle" style={{ marginBottom: 0, minWidth: '1200px', borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead className="sticky-top dashboard-table-header" style={{ zIndex: 5, position: 'sticky', top: 0 }}>
                    <tr style={{ fontWeight: '600', borderBottom: '2px solid #34495e', color: '#ffffff', fontSize: '0.8rem' }}>
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
                      <th style={{ cursor: 'pointer', minWidth: '200px' }} onClick={() => handleSort('damageContent')}>
                        Nội dung {getSortIcon('damageContent')}
                      </th>
                      <th style={{ cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('reportDate')}>
                        Ngày b/c {getSortIcon('reportDate')}
                      </th>
                      <th style={{ cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('reporterName')}>
                        Người b/c {getSortIcon('reporterName')}
                      </th>
                      <th style={{ cursor: 'pointer', minWidth: '120px' }} onClick={() => handleSort('handlerName')}>
                        Người xử lý {getSortIcon('handlerName')}
                      </th>
                      <th style={{ minWidth: '120px' }}>Người cập nhật</th>
                      <th style={{ cursor: 'pointer', minWidth: '100px' }} onClick={() => handleSort('status')}>
                        Trạng thái {getSortIcon('status')}
                      </th>
                      <th style={{ cursor: 'pointer', minWidth: '100px' }} onClick={() => handleSort('priority')}>
                        Ưu tiên {getSortIcon('priority')}
                      </th>
                      <th style={{ minWidth: '200px' }}>Ghi chú người xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="text-center py-4">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                          <span className="text-muted">Đang tải dữ liệu...</span>
                        </td>
                      </tr>
                    ) : currentReports.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-4">
                          <span className="text-muted">Không có dữ liệu</span>
                        </td>
                      </tr>
                    ) : (
                      currentReports.map((report) => (
                        <tr
                          key={report.id}
                          style={{
                            cursor: report.id && selectedIds.includes(report.id) ? 'pointer' : 'default',
                            verticalAlign: 'middle',
                            fontSize: '0.8rem'
                          }}
                        >
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
                                className="btn btn-link text-primary p-0 border-0 shadow-none"
                                title="Xem nhanh"
                                onClick={(e) => { e.stopPropagation(); openQuickView(report.id); }}
                                style={{ lineHeight: 1 }}
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
                          <td>
                            <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {report.damageContent || 'N/A'}
                            </div>
                          </td>
                          <td>{report.reportDate ? formatDateDisplay(report.reportDate) : 'N/A'}</td>
                          <td>{report.reporterName || 'N/A'}</td>
                          <td>{report.handlerName || 'Chưa phân công'}</td>
                          <td>{report.updatedByName || '-'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                              <select
                                className="form-control form-control-sm damage-report-status-select"
                                value={report.status}
                                onChange={(e) => handleStatusChange(report.id, Number(e.target.value) as DamageReportStatus)}
                                disabled={!canUpdateStatusForReport(report)}
                                style={{
                                  width: 'auto',
                                  minWidth: '85px',
                                  maxWidth: '100px',
                                  fontSize: '0.65rem',
                                  fontWeight: '600',
                                  padding: '0.1rem 0.4rem',
                                  height: '1.4rem',
                                  lineHeight: '1.2',
                                  border: 'none',
                                  borderRadius: '20px',
                                  display: 'inline-block',
                                  textAlign: 'center',
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  ...getStatusStyle(report.status)
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                 {isAdmin(currentUser?.roles) ? (
                                  <>
                                    <option value={DamageReportStatus.Pending} style={{ backgroundColor: '#f8f9fa', color: '#6c757d', fontSize: '0.7rem' }}>Chờ xử lý</option>
                                    <option value={DamageReportStatus.InProgress} style={{ backgroundColor: '#fff3cd', color: '#664d03', fontSize: '0.7rem' }}>Đang xử lý</option>
                                    <option value={DamageReportStatus.Completed} style={{ backgroundColor: '#d1e7dd', color: '#0f5132', fontSize: '0.7rem' }}>Hoàn thành</option>
                                    <option value={DamageReportStatus.Cancelled} style={{ backgroundColor: '#e9ecef', color: '#212529', fontSize: '0.7rem' }}>Đã hủy</option>
                                    <option value={DamageReportStatus.Rejected} style={{ backgroundColor: '#f8d7da', color: '#842029', fontSize: '0.7rem' }}>Từ chối</option>
                                  </>
                                ) : (
                                  <>
                                    {/* User can only see Pending option if they are currently Pending */}
                                    {report.status === DamageReportStatus.Pending && (
                                      <option value={DamageReportStatus.Pending} style={{ backgroundColor: '#f8f9fa', color: '#6c757d', fontSize: '0.7rem' }}>Chờ xử lý</option>
                                    )}
                                    {/* Can transition to or stay in InProgress */}
                                    {(report.status === DamageReportStatus.Pending || report.status === DamageReportStatus.InProgress) && (
                                      <option value={DamageReportStatus.InProgress} style={{ backgroundColor: '#fff3cd', color: '#664d03', fontSize: '0.7rem' }}>Đang xử lý</option>
                                    )}
                                    <option value={DamageReportStatus.Completed} style={{ backgroundColor: '#d1e7dd', color: '#0f5132', fontSize: '0.7rem' }}>Hoàn thành</option>
                                    {report.status === DamageReportStatus.Cancelled && (
                                      <option value={DamageReportStatus.Cancelled} style={{ backgroundColor: '#e9ecef', color: '#212529', fontSize: '0.7rem' }}>Đã hủy</option>
                                    )}
                                    <option value={DamageReportStatus.Rejected} style={{ backgroundColor: '#f8d7da', color: '#842029', fontSize: '0.7rem' }}>Từ chối</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-control form-control-sm damage-report-priority-select"
                              value={report.priority}
                              onChange={(e) => handlePriorityChange(report.id, Number(e.target.value) as DamageReportPriority)}
                              disabled={!userPermissions.canEdit || report.status === DamageReportStatus.Completed}
                              style={{
                                width: 'auto',
                                minWidth: '75px',
                                maxWidth: '90px',
                                fontSize: '0.65rem',
                                fontWeight: '600',
                                padding: '0.1rem 0.4rem',
                                height: '1.4rem',
                                lineHeight: '1.2',
                                border: 'none',
                                borderRadius: '20px',
                                display: 'inline-block',
                                textAlign: 'center',
                                appearance: 'none',
                                WebkitAppearance: 'none',
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
                          <td onClick={(e) => e.stopPropagation()}>
                            <HandlerNotesEditor
                              reportId={report.id}
                              value={report.handlerNotes || ''}
                              onChange={(newValue) => handleHandlerNotesChange(report.id, newValue)}
                              canEdit={(userPermissions.canEdit || (currentUserStaffId !== null && report.handlerId === currentUserStaffId)) && report.status !== DamageReportStatus.Completed}
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
            <div 
              className="flex-grow-1 p-2" 
              style={{ 
                overflowY: 'auto', 
                WebkitOverflowScrolling: 'touch',
                backgroundColor: '#f8f9fa'
              }}
            >
              <div className="row g-2">
                {loading ? (
                  <div className="col-12 text-center py-5">
                    <div className="spinner-border text-primary me-2" role="status"></div>
                    <span className="text-muted d-block mt-2">Đang tải dữ liệu...</span>
                  </div>
                ) : currentReports.length === 0 ? (
                  <div className="col-12 text-center py-5">
                    <span className="text-muted">Không có dữ liệu</span>
                  </div>
                ) : (
                  currentReports.map((report) => (
                  <div key={report.id} className="col-12 col-md-6 col-lg-4">
                    <div
                      key={report.id}
                      className="card border-0 mb-4 modern-status-card"
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.3s ease',
                        borderLeft: `6px solid ${getStatusStyle(report.status).color}`
                      }}
                    >
                      {/* Card Header - Branded Midnight Blue (#2c3e50) */}
                      <div
                        className="px-2 py-2"
                        style={{
                          backgroundColor: '#2c3e50',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleCheckboxChange(report.id)}
                      >
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span 
                              className="badge rounded-pill" 
                              style={{ 
                                backgroundColor: getStatusStyle(report.status).color, 
                                color: '#ffffff', 
                                fontSize: '0.7rem',
                                fontWeight: '901',
                                padding: '5px 10px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            >
                              #{report.id}
                            </span>
                            <h6 className="mb-0 text-truncate text-white" style={{
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              lineHeight: '1.2'
                            }}>
                              {report.displayLocation || 'Không xác định'}
                            </h6>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                              {report.deviceLocationName && (
                                <span className="text-white text-truncate" style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.9 }}>
                                  {report.deviceLocationName}
                                </span>
                              )}
                              {report.isOverdue && (
                                <span className="badge bg-danger text-white border-0 py-1" style={{ fontSize: '0.6rem', fontWeight: '800' }}>
                                  <i className="fas fa-clock me-1"></i> TRỄ
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-icon-only rounded-circle border-0"
                            style={{ 
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              color: '#ffffff',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={(e) => { e.stopPropagation(); openQuickView(report.id); }}
                          >
                            <i className="fas fa-expand-alt fa-sm"></i>
                          </button>
                          <div className="form-check m-0 p-0" style={{ minHeight: 'auto' }}>
                            <input
                              type="checkbox"
                              className="form-check-input ms-0"
                              checked={selectedIds.includes(report.id)}
                              onChange={() => handleCheckboxChange(report.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                cursor: 'pointer',
                                width: '1.3rem',
                                height: '1.3rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.3)',
                                backgroundColor: selectedIds.includes(report.id) ? '#3498db' : 'transparent'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="card-body px-2 py-3">
                        {/* Status Selectors - Row */}
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <label className="d-block text-muted mb-1 fw-bold" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái</label>
                            <div className="position-relative">
                              <select
                                className="form-select form-select-sm fw-bold border"
                                value={report.status}
                                onChange={(e) => handleStatusChange(report.id, Number(e.target.value) as DamageReportStatus)}
                                disabled={!canUpdateStatusForReport(report)}
                                style={{
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  height: '34px',
                                  borderColor: '#e2e8f0',
                                  color: '#2c3e50',
                                  backgroundColor: '#f8fafc'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isAdmin(currentUser?.roles) ? (
                                  <>
                                    <option value={DamageReportStatus.Pending}>Chờ xử lý</option>
                                    <option value={DamageReportStatus.InProgress}>Đang xử lý</option>
                                    <option value={DamageReportStatus.Completed}>Hoàn thành</option>
                                    <option value={DamageReportStatus.Cancelled}>Đã hủy</option>
                                    <option value={DamageReportStatus.Rejected}>Từ chối</option>
                                  </>
                                ) : (
                                  <>
                                    <option value={DamageReportStatus.Pending}>Chờ xử lý</option>
                                    <option value={DamageReportStatus.InProgress}>Đang xử lý</option>
                                    <option value={DamageReportStatus.Completed}>Hoàn thành</option>
                                    <option value={DamageReportStatus.Cancelled}>Đã hủy</option>
                                    <option value={DamageReportStatus.Rejected}>Từ chối</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>
                          <div className="col-6">
                            <label className="d-block text-muted mb-1 fw-bold" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ưu tiên</label>
                            <div className="position-relative">
                              <select
                                className="form-select form-select-sm fw-bold border"
                                value={report.priority}
                                onChange={(e) => handlePriorityChange(report.id, Number(e.target.value) as DamageReportPriority)}
                                disabled={!userPermissions.canEdit || report.status === DamageReportStatus.Completed}
                                style={{
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  height: '34px',
                                  borderColor: '#e2e8f0',
                                  color: getPriorityStyle(report.priority).color,
                                  backgroundColor: '#f8fafc'
                                }}
                              >
                                <option value={DamageReportPriority.Low}>Thấp</option>
                                <option value={DamageReportPriority.Normal}>Bình thường</option>
                                <option value={DamageReportPriority.High}>Cao</option>
                                <option value={DamageReportPriority.Urgent}>Khẩn cấp</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Damage Content - Branded Boxed Style */}
                        <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <label className="fw-800 text-muted mb-0" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Nội dung sự việc
                            </label>
                          </div>
                          <div
                            className="text-dark"
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              lineHeight: '1.5',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word'
                            }}
                          >
                            {report.damageContent || 'N/A'}
                          </div>
                        </div>

                        {/* Staff Information */}
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <div className="p-2 border rounded" style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
                              <span className="text-muted fw-bold d-block" style={{ fontSize: '0.55rem', textTransform: 'uppercase' }}>Người báo cáo</span>
                              <span className="fw-700 text-dark d-block text-truncate" style={{ fontSize: '0.8rem' }}>
                                {report.reporterName || 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="p-2 border rounded" style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
                              <span className="text-muted fw-bold d-block" style={{ fontSize: '0.55rem', textTransform: 'uppercase' }}>Người xử lý</span>
                              <span className={`fw-700 d-block text-truncate ${report.handlerName ? 'text-primary' : 'text-muted italic'}`} style={{ fontSize: '0.8rem' }}>
                                {report.handlerName || 'Chưa gán'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="row g-1 mb-3 text-center">
                          <div className="col-4">
                            <div className="py-1 bg-light rounded" style={{ border: '1px solid #edf2f7' }}>
                              <div style={{ fontSize: '0.5rem', color: '#718096', fontWeight: '800' }}>BÁO CÁO</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#2d3748' }}>
                                {report.reportDate ? formatDateDisplay(report.reportDate).split(' ')[0] : '--'}
                              </div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="py-1 bg-light rounded" style={{ border: '1px solid #edf2f7' }}>
                              <div style={{ fontSize: '0.5rem', color: '#718096', fontWeight: '800' }}>XỬ LÝ</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: report.handlingDate ? '#2d3748' : '#cbd5e1' }}>
                                {report.handlingDate ? formatDateDisplay(report.handlingDate).split(' ')[0] : '--'}
                              </div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="py-1 bg-light rounded" style={{ border: '1px solid #edf2f7' }}>
                              <div style={{ fontSize: '0.5rem', color: '#718096', fontWeight: '800' }}>XONG</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: report.completedDate ? '#38a169' : '#cbd5e1' }}>
                                {report.completedDate ? formatDateDisplay(report.completedDate).split(' ')[0] : '--'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Handler Notes - Boxed Style */}
                        {((report.handlerNotes && report.handlerNotes.trim() !== '') || 
                          ((userPermissions.canEdit || (currentUserStaffId !== null && report.handlerId === currentUserStaffId)) && 
                           report.status !== DamageReportStatus.Completed && 
                           report.status !== DamageReportStatus.Cancelled && 
                           report.status !== DamageReportStatus.Rejected)) && (
                        <div className="p-2 rounded mb-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }} onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="fw-800 text-success" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Kết quả / Ghi chú xử lý
                            </span>
                          </div>
                          <HandlerNotesEditor
                            reportId={report.id}
                            value={report.handlerNotes || ''}
                            onChange={(newValue) => handleHandlerNotesChange(report.id, newValue)}
                            isCard={true}
                            canEdit={(userPermissions.canEdit || (currentUserStaffId !== null && report.handlerId === currentUserStaffId)) && 
                                     report.status !== DamageReportStatus.Completed && 
                                     report.status !== DamageReportStatus.Cancelled && 
                                     report.status !== DamageReportStatus.Rejected}
                          />
                        </div>
                        )}

                        {/* Images Section */}
                        {report.images && report.images.length > 0 && (
                          <div className="mt-3 pt-2 border-top">
                            <div className="d-flex gap-2 overflow-auto pb-1 scrollbar-thin">
                              {report.images.map((img, idx) => (
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
                                    width: '42px',
                                    height: '42px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                  }}
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
                                    width: '48px',
                                    height: '48px',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.7rem',
                                    color: '#64748b',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
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
            {/* Nút Xem thêm cho Mobile */}
            {reports.length > currentReports.length && (
              <div className="text-center mt-4 mb-2">
                <button 
                  className="btn btn-primary px-4 py-2 shadow-sm"
                  style={{ borderRadius: '20px', fontWeight: '600', backgroundColor: '#0d6efd' }}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  <i className="fas fa-chevron-down me-2"></i> Xem thêm
                </button>
              </div>
            )}
          </div>
        )}

        </div>
        {/* Pagination Sticky Footer */}
        {totalPages > 1 && viewMode === 'table' && (
          <div 
            className="card-footer bg-white border-top py-2 mobile-sticky-footer" 
            style={{ 
              borderBottomLeftRadius: '12px', 
              borderBottomRightRadius: '12px'
            }}
          >
            <nav>
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link shadow-none border-0"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Trang trước"
                    aria-label="Trang trước"
                    style={{ borderRadius: '8px', margin: '0 2px' }}
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
                          className="page-link shadow-sm border-0"
                          onClick={() => handlePageChange(page)}
                          style={{ 
                            borderRadius: '8px', 
                            margin: '0 2px',
                            fontWeight: currentPage === page ? '700' : '500',
                            backgroundColor: currentPage === page ? undefined : '#f8f9fa'
                          }}
                        >
                          {page}
                        </button>
                      </li>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <li key={page} className="page-item disabled">
                        <span className="page-link bg-transparent border-0">...</span>
                      </li>
                    );
                  }
                  return null;
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link shadow-none border-0"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Trang sau"
                    aria-label="Trang sau"
                    style={{ borderRadius: '8px', margin: '0 2px' }}
                  >
                    <i className="fas fa-angle-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Damage Report */}
      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '850px' }}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header border-0 bg-light py-2 px-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                    <i className={`fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} fa-xs`}></i>
                  </div>
                  <h5 className="modal-title fw-bold mb-0" style={{ color: '#2c3e50', fontSize: '1rem' }}>
                    {isEdit ? 'Cập nhật báo cáo' : 'Lập báo cáo mới'}
                  </h5>
                </div>
                <button type="button" className="btn-close shadow-none scale-75" onClick={() => setShowModal(false)} style={{ transform: 'scale(0.8)' }}></button>
              </div>
              
              <div className="modal-body p-2 pt-0">
                <form className="needs-validation">
                  {/* Job Type Selector - Ultra Compact */}
                  <div className="mb-1">
                    <div className="row g-1">
                      {[
                        { id: 'device', label: 'Theo thiết bị', icon: 'fa-microchip', color: '#0d6efd' },
                        { id: 'other', label: 'Báo cáo chung', icon: 'fa-globe', color: '#6610f2' },
                        { id: 'maintenance', label: 'Bảo trì định kỳ', icon: 'fa-calendar-check', color: '#20c997' }
                      ].map((type) => (
                        <div key={type.id} className="col-4">
                          <div 
                            className={`p-1 py-1 text-center rounded-3 border h-100 d-flex align-items-center justify-content-center transition-all ${formData.deviceSelection === type.id ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-white border-light-subtle'}`}
                            style={{ cursor: 'pointer', transition: 'all 0.2s', border: formData.deviceSelection === type.id ? '2px solid !important' : '1px solid' }}
                            onClick={() => {
                              if (type.id === 'maintenance') {
                                loadMaintenanceBatches();
                                setFormData({ ...formData, deviceSelection: 'maintenance', deviceId: undefined, damageLocation: '' });
                              } else if (type.id === 'device') {
                                setFormData({ ...formData, deviceSelection: 'device', damageLocation: '', maintenanceBatchId: undefined });
                              } else {
                                setFormData({ ...formData, deviceSelection: 'other', deviceId: undefined, maintenanceBatchId: undefined });
                              }
                            }}
                          >
                            <i className={`fas ${type.icon} me-2 fa-sm`} style={{ color: formData.deviceSelection === type.id ? type.color : '#adb5bd' }}></i>
                            <span className="small fw-bold" style={{ color: formData.deviceSelection === type.id ? '#212529' : '#6c757d', fontSize: '0.65rem' }}>{type.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 1: Device/Location Info - Ultra Compact */}
                  <div className="bg-light bg-opacity-50 p-1 px-2 rounded-4 mb-1 border-start border-primary border-4">
                    <div className="row g-1">
                      {formData.deviceSelection === 'device' ? (
                        <>
                          <div className="col-md-6 col-6 mb-1">
                            <label className="form-label small fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Danh mục</label>
                            <div ref={categoryDropdownRef} className="position-relative">
                              <button
                                type="button"
                                className="form-select form-select-sm text-start d-flex justify-content-between align-items-center shadow-none px-2"
                                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                                style={{ minHeight: '28px', fontSize: '0.75rem' }}
                              >
                                <span className="text-truncate">
                                  {modalDeviceCategoryId === 0 ? 'Tất cả' : deviceCategories.find(c => c.id === modalDeviceCategoryId)?.name || 'Chọn'}
                                </span>
                              </button>
                              {isCategoryDropdownOpen && (
                                <div className="border border-0 shadow mt-1" style={{ position: 'absolute', zIndex: 1081, backgroundColor: '#fff', width: '100%', borderRadius: '12px', padding: '4px' }}>
                                  <div className="p-2 mb-1" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                    <div className="input-group input-group-sm">
                                      <span className="input-group-text bg-white border-end-0"><i className="fas fa-search text-muted" style={{ fontSize: '0.7rem' }}></i></span>
                                      <input autoFocus type="text" className="form-control form-control-sm border-start-0 shadow-none" placeholder="Tìm danh mục..." value={modalCategorySearch} onChange={(e) => setModalCategorySearch(e.target.value)} />
                                    </div>
                                  </div>
                                  <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0 4px' }}>
                                    <button type="button" className={`dropdown-item py-2 fw-medium ${modalDeviceCategoryId === 0 ? 'active' : ''}`} onClick={() => { setModalDeviceCategoryId(0); setIsCategoryDropdownOpen(false); }}>-- Tất cả danh mục --</button>
                                    {filteredModalCategories.map((cate) => (
                                      <button key={cate.id} type="button" className={`dropdown-item py-2 ${modalDeviceCategoryId === cate.id ? 'active' : ''}`} onClick={() => { setModalDeviceCategoryId(cate.id); setIsCategoryDropdownOpen(false); }}>
                                        <div className="small fw-bold">{cate.name}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6 col-6 mb-1">
                            <label className="form-label small fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Thiết bị <span className="text-danger">*</span></label>
                            <div ref={deviceDropdownRef} className="position-relative">
                              <button
                                type="button"
                                className="form-control form-select form-select-sm text-start d-flex justify-content-between align-items-center shadow-none px-2 text-primary fw-bold"
                                onClick={() => setIsDeviceDropdownOpen((prev) => !prev)}
                                style={{ minHeight: '28px', fontSize: '0.75rem' }}
                              >
                                <span className="text-truncate">
                                  {formData.deviceId 
                                    ? devices.find(d => d.id === formData.deviceId)?.name || '-- Tìm thiết bị --'
                                    : '-- Tìm thiết bị --'}
                                </span>
                              </button>
                              {isDeviceDropdownOpen && (
                                <div className="border border-0 shadow mt-1" style={{ position: 'absolute', zIndex: 1080, backgroundColor: '#fff', width: '100%', borderRadius: '12px', padding: '4px' }}>
                                  <div className="p-1 mb-1" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                    <div className="input-group input-group-sm">
                                      <span className="input-group-text bg-white border-end-0 py-0"><i className="fas fa-search text-muted" style={{ fontSize: '0.65rem' }}></i></span>
                                      <input autoFocus type="text" className="form-control form-control-sm border-start-0 shadow-none" style={{ fontSize: '0.75rem' }} placeholder="Tìm..." value={modalDeviceSearch} onChange={(e) => setModalDeviceSearch(e.target.value)} />
                                    </div>
                                  </div>
                                  <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0 2px' }}>
                                    <button type="button" className="dropdown-item py-1 fw-medium small text-primary" onClick={() => { setFormData({ ...formData, deviceId: undefined }); setIsDeviceDropdownOpen(false); }}>-- Bỏ chọn --</button>
                                    {filteredModalDevices.length === 0 ? (
                                      <div className="p-2 text-center text-muted" style={{ fontSize: '0.7rem' }}>Không tìm thấy</div>
                                    ) : (
                                      filteredModalDevices.map((d) => (
                                        <button type="button" key={d.id} className={`dropdown-item py-1 px-2 border-bottom border-light-subtle ${formData.deviceId === d.id ? 'active' : ''}`} onClick={() => { setFormData({ ...formData, deviceId: d.id }); setIsDeviceDropdownOpen(false); }}>
                                          <div className="d-flex align-items-center justify-content-between">
                                            <div className="text-truncate">
                                              <div className="fw-bold" style={{ fontSize: '0.75rem', color: formData.deviceId === d.id ? '#fff' : '#2c3e50' }}>{d.name}</div>
                                              <div className={formData.deviceId === d.id ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.6rem' }}>{d.serial || 'N/A'}</div>
                                            </div>
                                            {d.locationName && (
                                              <div className={`badge ${formData.deviceId === d.id ? 'bg-white text-primary' : 'bg-primary bg-opacity-10 text-primary'} ms-1 px-1`} style={{ fontSize: '0.55rem' }}>{d.locationName}</div>
                                            )}
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {formData.deviceId && (
                              <div className="d-flex align-items-center gap-1 mt-0" style={{ fontSize: '0.6rem', lineHeight: 1 }}>
                                <span className="text-primary fw-bold">
                                  <i className="fas fa-map-marker-alt me-1"></i>
                                  {devices.find(dev => dev.id === formData.deviceId)?.locationName || 'Chưa xác định'}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : formData.deviceSelection === 'maintenance' ? (
                        <div className="col-12 mb-1">
                          <label className="form-label small fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Đợt bảo trì <span className="text-danger">*</span></label>
                          <select
                            className="form-select form-select-sm shadow-none"
                            value={formData.maintenanceBatchId || ''}
                            onChange={(e) => setFormData({ ...formData, maintenanceBatchId: e.target.value || undefined })}
                            disabled={loadingBatches}
                            style={{ minHeight: '28px', fontSize: '0.75rem' }}
                          >
                            <option value="">-- Chọn đợt bảo trì --</option>
                            {maintenanceBatches.filter(b => !b.isCancelled).map((batch) => (
                              <option key={batch.batchId} value={batch.batchId}>{batch.title}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="col-12 mb-1">
                          <label className="form-label small fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Vị trí/Mô tả chung <span className="text-danger">*</span></label>
                          <input type="text" className="form-control form-control-sm shadow-none" value={formData.damageLocation || ''} onChange={(e) => setFormData({ ...formData, damageLocation: e.target.value })} placeholder="Ví dụ: Tường hành lang, Hệ thống điện..." style={{ minHeight: '28px', fontSize: '0.75rem' }} />
                        </div>
                      )}

                      <div className="col-6 mb-1">
                        <label className="form-label small fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Người báo cáo <span className="text-danger">*</span></label>
                        <select className="form-select form-select-sm shadow-none" value={formData.reporterId} onChange={(e) => setFormData({ ...formData, reporterId: Number(e.target.value) })} disabled={currentUserStaffId !== null} style={{ minHeight: '28px', fontSize: '0.75rem' }}>
                          <option value={0}>-- Người báo --</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="col-6 mb-1">
                        <label className="form-label small fw-bold mb-0" style={{ fontSize: '0.65rem' }}>Người xử lý</label>
                        <select className="form-select form-select-sm shadow-none" value={formData.handlerId || 0} onChange={(e) => setFormData({ ...formData, handlerId: Number(e.target.value) || undefined })} style={{ minHeight: '28px', fontSize: '0.75rem' }}>
                          <option value={0}>-- Phân công --</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                   {/* Section 2: Status & Time - Ultra Compact */}
                   <div className="bg-white p-1 px-2 border rounded-4 mb-1 shadow-sm border-light-subtle">
                     <div className="row g-1 align-items-end">
                       <div className="col-4">
                         <label className="form-label fw-bold text-muted text-uppercase mb-0" style={{ fontSize: '0.6rem' }}>Báo cáo</label>
                         <DateInput value={formData.reportDate} onChange={(v) => setFormData({ ...formData, reportDate: v })} required className="form-control form-control-sm shadow-none px-1" style={{ fontSize: '0.75rem', height: '28px' }} />
                       </div>
                       <div className="col-4">
                         <label className="form-label fw-bold text-muted text-uppercase mb-0" style={{ fontSize: '0.6rem' }}>Xử lý</label>
                         <DateInput value={formData.handlingDate} onChange={(v) => setFormData({ ...formData, handlingDate: v })} className="form-control form-control-sm shadow-none px-1" disabled={!isEdit} style={{ fontSize: '0.75rem', height: '28px' }} />
                       </div>
                       <div className="col-4">
                         <label className="form-label fw-bold text-muted text-uppercase mb-0" style={{ fontSize: '0.6rem' }}>Xong</label>
                         <DateInput value={formData.completedDate} onChange={(v) => setFormData({ ...formData, completedDate: v })} className="form-control form-control-sm shadow-none px-1" disabled={!isEdit} style={{ fontSize: '0.75rem', height: '28px' }} />
                       </div>
                       <div className="col-5 mt-1">
                         <label className="form-label fw-bold text-muted text-uppercase mb-0" style={{ fontSize: '0.6rem' }}>Ưu tiên</label>
                         <select className="form-select form-select-sm shadow-none px-1" style={{ height: '28px', fontSize: '0.75rem' }} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as DamageReportPriority })}>
                            <option value={DamageReportPriority.Low}>Thấp</option>
                            <option value={DamageReportPriority.Normal}>Bình thường</option>
                            <option value={DamageReportPriority.High}>Cao</option>
                            <option value={DamageReportPriority.Urgent}>Khẩn cấp</option>
                         </select>
                       </div>
                       <div className="col-7 mt-1">
                         <label className="form-label fw-bold text-muted text-uppercase mb-0" style={{ fontSize: '0.6rem' }}>Trạng thái</label>
                         <select className="form-select form-select-sm shadow-none fw-bold text-primary px-1" style={{ height: '28px', fontSize: '0.75rem' }} value={formData.status} disabled={!isEdit} onChange={(e) => {
                            const newStatus = Number(e.target.value) as DamageReportStatus;
                            let updates: any = { status: newStatus };
                            if (newStatus === DamageReportStatus.InProgress && !formData.handlingDate) {
                              updates.handlingDate = formatDateInput(new Date());
                            } else if (newStatus === DamageReportStatus.Completed) {
                              if (!formData.handlingDate) updates.handlingDate = formatDateInput(new Date());
                              if (!formData.completedDate) updates.completedDate = formatDateInput(new Date());
                            }
                            setFormData({ ...formData, ...updates });
                          }}>
                            <option value={DamageReportStatus.Pending}>Chờ xử lý</option>
                            <option value={DamageReportStatus.InProgress}>Đang xử lý</option>
                            <option value={DamageReportStatus.Completed}>Hoàn thành</option>
                            <option value={DamageReportStatus.Cancelled}>Đã hủy</option>
                            <option value={DamageReportStatus.Rejected}>Từ chối</option>
                         </select>
                       </div>
                     </div>
                   </div>

                  {/* Section 3 & 4: Content & Notes - Ultra Compact */}
                  <div className="row g-1 mb-1">
                    <div className="col-12">
                      <label className="form-label fw-bold mb-0" style={{ fontSize: '0.7rem' }}><i className="fas fa-edit me-1 text-primary"></i>Nội dung sự vụ <span className="text-danger">*</span></label>
                      <textarea 
                        className="form-control shadow-none" 
                        rows={2} 
                        style={{ borderRadius: '8px', resize: 'none', padding: '6px', fontSize: '0.75rem' }}
                        value={formData.damageContent || ''} 
                        onChange={(e) => setFormData({ ...formData, damageContent: e.target.value })}
                        placeholder="Mô tả chi tiết..."
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold text-success mb-0" style={{ fontSize: '0.7rem' }}><i className="fas fa-comment-medical me-1"></i>Ghi chú/Kết quả</label>
                      <textarea 
                        className="form-control shadow-none bg-light bg-opacity-25" 
                        rows={1} 
                        style={{ borderRadius: '8px', resize: 'none', borderStyle: 'dashed', fontSize: '0.75rem', padding: '6px' }}
                        value={formData.handlerNotes || ''} 
                        onChange={(e) => setFormData({ ...formData, handlerNotes: e.target.value })}
                        placeholder="Kết quả xử lý..."
                      ></textarea>
                    </div>
                  </div>

                  {/* Section 5: Photos - Compact */}
                  <div className="row g-1 mb-0">
                    <div className="col-6">
                      <div className="card border-0 shadow-sm overflow-hidden h-100" style={{ borderRadius: '10px', backgroundColor: '#f8fbff' }}>
                        <div className="p-1 px-2">
                          <div className="d-flex justify-content-between align-items-center mb-0">
                             <div className="fw-bold small text-primary" style={{ fontSize: '0.65rem' }}>TRƯỚC</div>
                             <button type="button" className="btn btn-primary btn-sm rounded-pill py-0 px-2" style={{ fontSize: '0.6rem' }} onClick={() => { setFileManagerMode('image'); setFileManagerTarget('images'); setShowFileManager(true); }}>+</button>
                          </div>
                          <div className="d-flex flex-wrap gap-1" style={{ minHeight: '35px' }}>
                            {formData.images?.map((img, idx) => (
                              <div key={idx} className="position-relative" style={{ width: '45px', height: '35px' }}>
                                <img src={img} className="rounded shadow-sm" alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button type="button" className="btn-close position-absolute top-0 end-0 bg-white shadow-sm p-1 rounded-circle" style={{ width: '6px', height: '6px', margin: '-3px' }} onClick={() => setFormData({ ...formData, images: (formData.images || []).filter((_, i) => i !== idx) })} />
                              </div>
                            ))}
                            {(!formData.images || formData.images.length === 0) && <div className="text-muted small italic opacity-50" style={{ fontSize: '0.6rem' }}>-</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card border-0 shadow-sm overflow-hidden h-100" style={{ borderRadius: '10px', backgroundColor: '#f6fff9' }}>
                        <div className="p-1 px-2">
                          <div className="d-flex justify-content-between align-items-center mb-0">
                             <div className="fw-bold small text-success" style={{ fontSize: '0.65rem' }}>SAU</div>
                             <button type="button" className="btn btn-success btn-sm rounded-pill py-0 px-2" style={{ fontSize: '0.6rem' }} onClick={() => { setFileManagerMode('image'); setFileManagerTarget('afterImages'); setShowFileManager(true); }}>+</button>
                          </div>
                          <div className="d-flex flex-wrap gap-1" style={{ minHeight: '35px' }}>
                            {formData.afterImages?.map((img, idx) => (
                              <div key={idx} className="position-relative" style={{ width: '45px', height: '35px' }}>
                                <img src={img} className="rounded shadow-sm" alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button type="button" className="btn-close position-absolute top-0 end-0 bg-white shadow-sm p-1 rounded-circle" style={{ width: '6px', height: '6px', margin: '-3px' }} onClick={() => setFormData({ ...formData, afterImages: (formData.afterImages || []).filter((_, i) => i !== idx) })} />
                              </div>
                            ))}
                            {(!formData.afterImages || formData.afterImages.length === 0) && <div className="text-muted small italic opacity-50" style={{ fontSize: '0.6rem' }}>-</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              
              <div className="modal-footer border-0 p-2 pt-0">
                <div className="d-flex w-100 gap-2">
                  <button type="button" className="btn btn-light rounded-pill btn-sm flex-fill" style={{ fontWeight: '600' }} onClick={() => setShowModal(false)}>
                    <i className="fas fa-times me-1"></i>Hủy
                  </button>
                  {!isEdit && (
                    <button type="button" className="btn btn-success rounded-pill btn-sm shadow-sm flex-fill" style={{ fontWeight: '700' }} onClick={() => handleSave(true)}>
                      <i className="fas fa-check me-1"></i>Xong
                    </button>
                  )}
                  <button type="button" className="btn btn-primary rounded-pill btn-sm shadow-sm flex-fill" style={{ fontWeight: '700' }} onClick={() => handleSave(false)}>
                    <i className="fas fa-save me-1"></i>Lưu
                  </button>
                </div>
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
            if (fileManagerTarget === 'images') {
              setFormData(prev => ({ ...prev, images: Array.from(new Set([...(prev.images || []), url])) }));
            } else {
              if (completionModal.show) {
                updateCompletionModal({ afterImages: Array.from(new Set([...(completionModal.afterImages || []), url])) });
              } else {
                setFormData(prev => ({ ...prev, afterImages: Array.from(new Set([...(prev.afterImages || []), url])) }));
              }
            }
            setShowFileManager(false);
          }}
          onSelectFiles={(urls: string[]) => {
            if (!urls || urls.length === 0) {
              toast.warning('Vui lòng chọn ít nhất một hình ảnh');
              return;
            }
            if (fileManagerTarget === 'images') {
              setFormData(prev => ({
                ...prev,
                images: Array.from(new Set([...(prev.images || []), ...urls])),
              }));
            } else {
              if (completionModal.show) {
                updateCompletionModal({ 
                  afterImages: Array.from(new Set([...(completionModal.afterImages || []), ...urls])) 
                });
              } else {
                setFormData(prev => ({
                  ...prev,
                  afterImages: Array.from(new Set([...(prev.afterImages || []), ...urls])),
                }));
              }
            }
            setShowFileManager(false);
          }}
          accept="image/*"
          mode="image"
          multiSelect
          canManageFiles={isAdmin(currentUser?.roles)}
        />
      )}

      {showQuickView && (
        <QuickViewReportModal
          isOpen={showQuickView}
          reportId={selectedQuickReportId || 0}
          onClose={closeQuickView}
          onViewImages={(images, index) => {
            setSelectedImages(images);
            setCurrentImageIndex(index);
            setShowImageModal(true);
          }}
          onUpdate={loadData}
        />
      )}

      {/* Status Update Modal (Generic Completion Modal) */}
      {completionModal.show && completionModal.report && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {completionModal.targetStatus === DamageReportStatus.Completed ? 'Hoàn thành báo cáo' : 
                   completionModal.targetStatus === DamageReportStatus.Cancelled ? 'Hủy báo cáo' : 'Từ chối báo cáo'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    if (!completionModal.submitting) {
                      resetCompletionModal();
                    }
                  }}
                  disabled={completionModal.submitting}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="small text-muted">Báo cáo</div>
                  <div className="fw-semibold">
                    #{completionModal.report.id} ·{' '}
                    {completionModal.report.displayLocation || completionModal.report.damageLocation || 'Không rõ vị trí'}
                  </div>
                  <div className="text-muted">
                    {completionModal.report.damageContent || 'Không có mô tả'}
                  </div>
                </div>

                {completionModal.targetStatus === DamageReportStatus.Completed && (
                <div className="mb-3">
                  <label className="form-label">
                    Loại xử lý <span className="text-danger">*</span>
                  </label>
                  {loadingCompletionTypes ? (
                    <div className="d-flex align-items-center gap-2">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                      <span>Đang tải danh sách loại sự kiện...</span>
                    </div>
                  ) : (
                    <select
                      className="form-control"
                      value={completionModal.eventTypeId ?? ''}
                      onChange={(e) =>
                        updateCompletionModal({
                          eventTypeId: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      disabled={completionModal.submitting}
                    >
                      <option value="">-- Chọn loại xử lý --</option>
                      {completionEventTypes.length === 0 && (
                        <option value="" disabled>
                          (Chưa có danh mục sự kiện phù hợp)
                        </option>
                      )}
                      {completionEventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                          {type.category ? ` · ${type.category}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                )}

                {completionModal.targetStatus === DamageReportStatus.Completed && (
                <div className="mb-3">
                  <label className="form-label">
                    Thiết bị liên quan
                  </label>
                  <select
                    className="form-control"
                    value={completionModal.deviceId ?? completionModal.report.deviceId ?? ''}
                    onChange={(e) =>
                      updateCompletionModal({
                        deviceId: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    disabled={completionModal.submitting}
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name}
                        {device.serial ? ` (${device.serial})` : ''}
                        {device.deviceCategoryName ? ` · ${device.deviceCategoryName}` : ''}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    Có thể chọn thiết bị khác nếu cần điều chỉnh trước khi hoàn thành.
                  </small>
                </div>
                )}

                <div className="mb-3">
                  <label className="form-label text-secondary" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-desktop me-1"></i> Xác nhận tình trạng thiết bị <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={completionModal.finalDeviceStatus || DeviceStatus.DangSuDung}
                    onChange={(e) => updateCompletionModal({ finalDeviceStatus: Number(e.target.value) })}
                    disabled={completionModal.submitting}
                  >
                    <option value={DeviceStatus.DangSuDung}>Đang sử dụng (Bình thường)</option>
                    <option value={DeviceStatus.HuHong}>Hư hỏng không dùng được</option>
                    <option value={DeviceStatus.CoHuHong}>Có hư hỏng (Cần theo dõi thêm)</option>
                  </select>
                </div>

                {completionModal.targetStatus === DamageReportStatus.Completed && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Tiêu đề sự kiện</label>
                    <input
                      type="text"
                      className="form-control"
                      value={completionModal.eventTitle}
                      onChange={(e) => updateCompletionModal({ eventTitle: e.target.value })}
                      placeholder="Ví dụ: Hoàn thành sửa chữa thiết bị"
                      disabled={completionModal.submitting}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Nội dung sự kiện</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={completionModal.eventDescription}
                      onChange={(e) => updateCompletionModal({ eventDescription: e.target.value })}
                      placeholder="Mô tả ngắn gọn công việc đã thực hiện"
                      disabled={completionModal.submitting}
                    />
                  </div>
                </>
                )}

                <div className="mb-3">
                  <label className="form-label">
                    {completionModal.targetStatus === DamageReportStatus.Completed ? 'Ghi chú người xử lý' : 'Lý do / Ghi chú'}
                  </label>
                  <textarea
                    className="form-control"
                    rows={completionModal.targetStatus === DamageReportStatus.Completed ? 2 : 4}
                    value={completionModal.handlerNotes}
                    onChange={(e) => updateCompletionModal({ handlerNotes: e.target.value })}
                    placeholder={completionModal.targetStatus === DamageReportStatus.Completed ? "Ghi chú nội bộ cho báo cáo" : "Nhập lý do cụ thể..."}
                    disabled={completionModal.submitting}
                  />
                  <small className="text-muted">
                    {completionModal.targetStatus === DamageReportStatus.Completed 
                      ? 'Nội dung này sẽ được lưu vào mục "Ghi chú người xử lý" của báo cáo và gắn vào sự kiện.'
                      : 'Nội dung này sẽ được lưu vào mục "Ghi chú người xử lý" của báo cáo.'}
                  </small>
                </div>

                {completionModal.targetStatus === DamageReportStatus.Completed && (
                <div className="mb-3">
                  <div className="p-3 border rounded shadow-sm" style={{ backgroundColor: '#f6fff9', borderColor: '#d1e7dd' }}>
                    <label className="form-label d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold" style={{ color: '#198754' }}>
                        <i className="fas fa-check-circle me-1"></i> Hình ảnh sau khi xử lý (Đối chứng)
                      </span>
                      <button type="button" className="btn btn-sm btn-success py-1" style={{ fontSize: '0.8rem' }} onClick={() => {
                        setFileManagerMode('image');
                        setFileManagerTarget('afterImages');
                        setShowFileManager(true);
                      }}>
                        <i className="fas fa-plus me-1"></i> Chọn hình
                      </button>
                    </label>
                    {completionModal.afterImages && completionModal.afterImages.length > 0 ? (
                      <div className="d-flex flex-wrap gap-2">
                        {completionModal.afterImages.map((img, idx) => (
                          <div key={`${img}-${idx}`} className="position-relative" style={{ width: 100, height: 75 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="after-img" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid #dee2e6' }} />
                            <button type="button" className="btn-close" aria-label="Remove" onClick={() => updateCompletionModal({ afterImages: completionModal.afterImages.filter((_, i) => i !== idx) })} style={{ position: 'absolute', top: -5, right: -5, width: '0.6rem', height: '0.6rem' }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted small bg-white p-2 rounded border border-dashed text-center">
                        <i className="fas fa-image me-1 opacity-50"></i> Nên đính kèm hình ảnh sau khi đã xử lý xong để đối chiếu.
                      </div>
                    )}
                  </div>
                </div>
                )}

                {completionModalError && (
                  <div className="alert alert-danger py-2 px-3" role="alert">
                    {completionModalError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!completionModal.submitting) {
                      resetCompletionModal();
                    }
                  }}
                  disabled={completionModal.submitting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmCompletion}
                  disabled={
                    completionModal.submitting ||
                    loadingCompletionTypes ||
                    completionEventTypes.length === 0
                  }
                >
                  {completionModal.submitting ? (
                    <span className="d-inline-flex align-items-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Đang xử lý...
                    </span>
                  ) : (
                    'Xác nhận hoàn thành'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Completion Confirmation Modal */}
      {showMaintenanceConfirmModal && pendingMaintenanceReport && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                  Xác nhận hoàn thành bảo trì
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowMaintenanceConfirmModal(false);
                    setPendingMaintenanceReport(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Bạn có chắc đã hoàn thành bảo trì này không?</strong>
                  <br />
                  <small>Dữ liệu sẽ được đồng bộ lên hệ thống ngay bây giờ.</small>
                </div>
                <div className="mb-3">
                  <div className="small text-muted">Báo cáo</div>
                  <div className="fw-semibold">
                    #{pendingMaintenanceReport.id} · {pendingMaintenanceReport.damageContent || 'Bảo trì định kỳ'}
                  </div>
                  {pendingMaintenanceReport.maintenanceBatchId && (
                    <div className="text-muted small mt-1">
                      Đợt bảo trì: {pendingMaintenanceReport.maintenanceBatchId}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowMaintenanceConfirmModal(false);
                    setPendingMaintenanceReport(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleMaintenanceCompletion}
                >
                  <i className="fas fa-check me-2"></i>
                  Đồng ý
                </button>
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
                <h5 className="modal-title">Xuất Excel - Báo cáo</h5>
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
                    <DateInput
                      value={exportFromDate}
                      onChange={(value) => setExportFromDate(value)}
                      max={exportToDate}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Đến ngày <span className="text-danger">*</span></label>
                    <DateInput
                      value={exportToDate}
                      onChange={(value) => setExportToDate(value)}
                      min={exportFromDate}
                      max={new Date()}
                      required
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