'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import React from 'react';
import api from '@/lib/utils/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { toast } from 'react-toastify';
import { DeviceVM, DeviceStatus, DeviceCategory, Department, Location, DeviceHistorySummary, EventStatus, DamageReportStatus } from '@/types';
import { formatDateDisplay, formatDateInput, formatDateTime } from '@/lib/utils/dateFormat';
import DateInput from '@/components/DateInput';
import dynamic from 'next/dynamic';
import FileManager from '@/components/FileManager';
import AdminRoute from '@/components/AdminRoute';
import QuickViewReportModal from '@/components/QuickViewReportModal';
import SearchableSelect from '@/components/SearchableSelect';
import ExportModal from '@/components/ExportModal';
import * as XLSX from 'xlsx';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

function DevicesPageContent() {
  // Control mobile filter visibility
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceVM[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceVM[]>([]); // Store all devices from API
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<DeviceStatus | 0>(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Quick Add Location modal state
  const [showQuickAddLocation, setShowQuickAddLocation] = useState(false);
  const [quickAddLocationName, setQuickAddLocationName] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Editor state
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [quillValue, setQuillValue] = useState(''); // Separate state for ReactQuill
  
  // File Manager state
  const [showFileManager, setShowFileManager] = useState(false);
  const [fileManagerMode, setFileManagerMode] = useState<'image' | 'all'>('image');
  const [fileManagerCallback, setFileManagerCallback] = useState<((url: string) => void) | null>(null);
  const fileManagerCallbackRef = useRef<((url: string) => void) | null>(null);
  const pendingImageUrl = useRef<string | null>(null);
  const quillInsertIndex = useRef<number | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<DeviceHistorySummary | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  
  // Define quillModules using useMemo at top level to avoid hook order violation
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: function(this: any) {
          console.log('Quill toolbar image handler triggered');
          // Open file manager for image selection
          setFileManagerMode('image');
          // Ensure no leftover pending URL accidentally updates image field
          pendingImageUrl.current = null;
          try {
            const editor = (this as any).quill;
            if (editor) {
              editor.focus();
              const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
              quillInsertIndex.current = range.index;
              console.log('Stored quillInsertIndex:', quillInsertIndex.current);
            } else {
              quillInsertIndex.current = null;
            }
          } catch (e) {
            console.warn('Unable to capture selection before opening FileManager:', e);
            quillInsertIndex.current = null;
          }
          const quillImageCallback = (url: string) => {
            console.log('Quill image handler received URL:', url);
            if (!url) return;
            
            // Lấy relative path từ URL
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
            
            // Thêm img vào đúng vị trí con trỏ bằng Quill API và đồng bộ lại state
            const imgTag = `<img src="${relativePath}" alt="" />`;
            setTimeout(() => {
              try {
                // Access editor through the handler context
                const editor = (this as any).quill;
                if (editor) {
                  // Prefer stored index to avoid lost selection after modal
                  const insertIndex = (typeof quillInsertIndex.current === 'number')
                    ? quillInsertIndex.current!
                    : editor.getLength();
                  editor.focus();
                  editor.insertEmbed(insertIndex, 'image', relativePath, 'user');
                  editor.setSelection(insertIndex + 1, 0);
                  quillInsertIndex.current = null;
                  const html = editor.root?.innerHTML || '';
                  setQuillValue(html);
                  setFormData((prev) => ({ ...prev, description: html }));
                } else {
                  // Fallback: append to end
                  setQuillValue((prev) => (prev ? prev + `<p>${imgTag}</p>` : `<p>${imgTag}</p>`));
                  setFormData((prev) => ({ ...prev, description: prev.description ? prev.description + `<p>${imgTag}</p>` : `<p>${imgTag}</p>` }));
                }
              } catch (e) {
                console.error('Error inserting image into Quill:', e);
              }
            }, 50);
          };
          setFileManagerCallback(quillImageCallback);
          fileManagerCallbackRef.current = quillImageCallback;
          setShowFileManager(true);
        }
      }
    }
  }), []); // Empty deps array since we're using state setters which are stable
  
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    serial: '',
    description: '',
    img: '',
    warrantyDate: '',
    useDate: '',
    endDate: '',
    departmentId: 0,
    locationId: 0,
    deviceCategoryId: 0,
    status: DeviceStatus.DangSuDung,
  });
  
  // Debug: Log formData.img changes
  useEffect(() => {
    console.log('formData.img changed to:', formData.img);
  }, [formData.img]);
  
  // Handle pending image URL from FileManager
  useEffect(() => {
    if (pendingImageUrl.current) {
      const url = pendingImageUrl.current;
      pendingImageUrl.current = null;
      
      console.log('Processing pending image URL:', url);
      
      // Do not strip absolute url
      let relativePath = url.trim();
      
      console.log('Setting img from pending URL to:', relativePath);
      setFormData((prev) => {
        console.log('Updating formData.img from pending:', {
          from: prev.img,
          to: relativePath
        });
        return { ...prev, img: relativePath };
      });
    }
  }, [showFileManager]); // Trigger when modal closes
  const [isEdit, setIsEdit] = useState(false);

  // SWR hooks for data fetching
  const { data: categoriesData } = useSWR<{ status: boolean; data: DeviceCategory[] }>('/device-categories', fetcher);
  const { data: departmentsData } = useSWR<{ status: boolean; data: Department[] }>('/departments', fetcher);
  const { data: locationsData, mutate: mutateLocations } = useSWR<{ status: boolean; data: Location[] }>('/locations', fetcher);

  const categories = (categoriesData?.data || []) as DeviceCategory[];
  const departments = (departmentsData?.data || []) as Department[];
  const locations = (locationsData?.data || []) as Location[];

  const currentParams = useMemo(() => {
    return new URLSearchParams({
      cateId: selectedCategory.toString(),
      departmentId: selectedDepartment.toString(),
      locationId: selectedLocation.toString(),
      status: selectedStatus.toString(),
      search: searchKeyword,
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      sortField: sortField,
      sortOrder: sortOrder
    }).toString();
  }, [selectedCategory, selectedDepartment, selectedLocation, selectedStatus, searchKeyword, currentPage, itemsPerPage, sortField, sortOrder]);

  const { data: response, isLoading: reportsLoading, mutate } = useSWR(
    `/devices?${currentParams}`, 
    fetcher, 
    { refreshInterval: 15000 }
  );

  // Update devices when response matches
  useEffect(() => {
    if (response?.status) {
      setDevices(response.data || []);
      setAllDevices(response.data || []);
      setTotalItems(response.total || 0);
    }
  }, [response]);

  useEffect(() => {
    setLoading(reportsLoading);
  }, [reportsLoading]);

  const loadData = async () => { mutate(); };
  const loadCategories = async () => { /* Now handled by SWR */ };
  const loadDepartments = async () => { /* Now handled by SWR */ };

  const handleNew = () => {
    setIsEdit(false);
    setFormData({
      id: 0,
      name: '',
      serial: '',
      description: '',
      img: '',
      warrantyDate: '',
      useDate: '',
      endDate: '',
      departmentId: departments[0]?.id || 0,
      locationId: 0,
      deviceCategoryId: categories[0]?.id || 0,
      status: DeviceStatus.DangSuDung,
    });
    setHtmlSource('');
    setQuillValue('');
    setShowHtmlSource(false);
    setFileManagerCallback(null);
    fileManagerCallbackRef.current = null;
    setShowImagePreview(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn 1 thiết bị để sửa');
      return;
    }

    const device = devices.find((d) => d.id === selectedIds[0]);
    if (device) {
      setIsEdit(true);
      // Giữ nguyên đường dẫn ảnh từ device (không chuẩn hóa để tương thích với thẻ src img của absolute URL)
      let normalizedImg = device.img ? device.img.trim() : '';

      setFormData({
        id: device.id,
        name: device.name || '',
        serial: device.serial || '',
        description: device.description || '',
        img: normalizedImg,
        warrantyDate: formatDateInput(device.warrantyDate),
        useDate: formatDateInput(device.useDate),
        endDate: formatDateInput(device.endDate),
        departmentId: device.departmentId,
        locationId: device.locationId || 0,
        deviceCategoryId: device.deviceCategoryId,
        status: device.status,
      });
      setHtmlSource(device.description || '');
      setQuillValue(device.description || '');
      setShowHtmlSource(false);
      setFileManagerCallback(null);
      fileManagerCallbackRef.current = null;
      setShowImagePreview(false);
      setShowModal(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 thiết bị để xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa các thiết bị đã chọn?')) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const response = await api.delete(`/devices/${id}`);
        if (!response.data.status) {
          toast.error('Không thể xóa một số thiết bị đã được sử dụng');
          return;
        }
      }
      toast.success('Xóa thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa thiết bị');
    }
  };

  const handleViewHistory = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn thiết bị để xem lịch sử!');
      return;
    }
    if (selectedIds.length > 1) {
      toast.warning('Vui lòng chỉ chọn 1 thiết bị duy nhất để xem lịch sử!');
      return;
    }

    const deviceId = selectedIds[0];
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData(null);

    try {
      const response = await api.get(`/devices/${deviceId}/history`);
      if (response.data?.status) {
        setHistoryData(response.data.data || null);
      } else {
        toast.error(response.data?.error || 'Không thể tải lịch sử thiết bị');
        setShowHistoryModal(false);
      }
    } catch (error: any) {
      console.error('Error loading device history:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi tải lịch sử thiết bị');
      setShowHistoryModal(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryLoading(false);
    setHistoryData(null);
  };

  const removeAccents = (str: string) => {
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const handleExportHistoryExcel = () => {
    if (!historyData) {
      toast.warning('Chưa có dữ liệu lịch sử để xuất');
      return;
    }
    
    try {
      const wb = XLSX.utils.book_new();
      
      const dataRows: any[][] = [
        ['', '', '', 'BÁO CÁO VÒNG ĐỜI THIẾT BỊ'], // Row 1
        ['Tên thiết bị:', '', historyData.deviceName || 'Thiết bị không xác định'], // Row 2
        ['Số Serial:', '', historyData.deviceSerial || '—'], // Row 3
        ['Tổng số lần báo hư:', '', historyData.totalReports], // Row 4
        ['Tổng số sự kiện bảo trì:', '', historyData.totalEvents], // Row 5
        [''], // Row 6
        ['CHI TIẾT'], // Row 7
        ['STT', 'Ngày tháng', 'Phân loại', 'Nội dung/Tiêu đề', 'Mô tả chi tiết', 'Trạng thái', 'Mã tham chiếu'] // Row 8
      ];

      // Prepare merged timeline data
      const linkedReportIds = historyData.events
        .filter(e => e.relatedReportId)
        .map(e => e.relatedReportId);
        
      const unlinkedReports = historyData.reports.filter(r => !linkedReportIds.includes(r.reportId));
      
      const timeline: any[] = [];
      historyData.events.forEach(event => {
        timeline.push({
          date: event.reportedAt || event.eventDate,
          type: event.eventTypeName || 'Sửa chữa',
          title: event.title || '—',
          description: (event.description || '').replace(/<[^>]*>?/gm, ''),
          status: event.statusLabel,
          ref: event.relatedReportId ? `#Báo cáo ${event.relatedReportId}` : (event.id ? `#Sự kiện ${event.id}` : '—'),
          sortDate: new Date(event.reportedAt || event.eventDate || 0).getTime()
        });
      });
      unlinkedReports.forEach(report => {
        timeline.push({
          date: report.reportDate,
          type: report.eventTypeName || 'Báo cáo',
          title: `Báo cáo #${report.reportId}`,
          description: (report.damageContent || '').replace(/<[^>]*>?/gm, ''),
          status: report.statusName,
          ref: `#Báo cáo ${report.reportId}`,
          sortDate: new Date(report.reportDate || 0).getTime()
        });
      });
      timeline.sort((a, b) => b.sortDate - a.sortDate);
      
      timeline.forEach((item, index) => {
        dataRows.push([
          (index + 1).toString(),
          formatDateTime(item.date) || '—',
          item.type,
          item.title,
          item.description,
          item.status,
          item.ref
        ]);
      });

      if (timeline.length === 0) {
        dataRows.push(['', 'Không có dữ liệu lịch sử.']);
      }

      // Add "Ngày xuất báo cáo" at the bottom
      dataRows.push(['']);
      dataRows.push(['Ngày xuất báo cáo:', '', new Date().toLocaleString('vi-VN')]);

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      
      ws['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 45 }, { wch: 65 }, { wch: 18 }, { wch: 18 }
      ];
      
      ws['!merges'] = [
        { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Row 2 Label
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Row 3 Label
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Row 4 Label
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Row 5 Label
        { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, // CHI TIET
        { s: { r: dataRows.length - 1, c: 0 }, e: { r: dataRows.length - 1, c: 1 } } // Bottom label
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Vong doi thiet bi");

      const rawDeviceName = historyData.deviceName || 'thiet_bi';
      const safeName = removeAccents(rawDeviceName).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Vong_doi_thiet_bi_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      toast.success('Xuất file Excel thành công theo đúng định dạng');
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      toast.error('Có lỗi xảy ra khi xuất file Excel');
    }
  };

  const handleQuickViewReport = (reportId: number) => {
    setSelectedReportId(reportId);
    setShowQuickView(true);
  };

  // Use utility function from dateFormat.ts
  const formatDateTimeLocal = (value: string | null | undefined) => {
    const result = formatDateTime(value);
    return result || '-';
  };

  const getEventStatusBadgeClass = (status: EventStatus): string => {
    switch (status) {
      case EventStatus.Planned:
        return 'badge bg-secondary';
      case EventStatus.InProgress:
        return 'badge bg-primary';
      case EventStatus.Cancelled:
        return 'badge bg-danger';
      case EventStatus.Missed:
        return 'badge bg-warning text-dark';
      case EventStatus.Completed:
      default:
        return 'badge bg-success';
    }
  };

  const getReportStatusBadgeClass = (status: DamageReportStatus): string => {
    switch (status) {
      case DamageReportStatus.Pending:
        return 'badge bg-warning text-dark';
      case DamageReportStatus.Assigned:
        return 'badge bg-info text-dark';
      case DamageReportStatus.InProgress:
        return 'badge bg-primary';
      case DamageReportStatus.Completed:
        return 'badge bg-success';
      case DamageReportStatus.Cancelled:
        return 'badge bg-secondary';
      case DamageReportStatus.Rejected:
        return 'badge bg-danger';
      default:
        return 'badge bg-light text-dark';
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Vui lòng nhập tên thiết bị');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        serial: formData.serial || null,
        description: formData.description || null,
        img: formData.img || null,
        warrantyDate: formData.warrantyDate || null,
        useDate: formData.useDate || null,
        endDate: formData.endDate || null,
        departmentId: formData.departmentId,
        locationId: formData.locationId || null,
        deviceCategoryId: formData.deviceCategoryId,
        status: formData.status,
      };

      if (isEdit) {
        await api.put(`/devices/${formData.id}`, { ...payload, id: formData.id });
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/devices', payload);
        toast.success('Thêm mới thành công');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới');
    }
  };

  const handleQuickAddLocation = async () => {
    if (!quickAddLocationName.trim()) {
      toast.error('Vui lòng nhập tên vị trí');
      return;
    }
    try {
      const res = await api.post('/locations', { name: quickAddLocationName.trim() });
      if (res.data.status) {
        toast.success(`Đã thêm vị trí "${quickAddLocationName.trim()}"`);
        await mutateLocations(); // Refresh locations list
        setFormData(prev => ({ ...prev, locationId: res.data.data.id }));
        setQuickAddLocationName('');
        setShowQuickAddLocation(false);
      } else {
        toast.error(res.data.error || 'Lỗi khi thêm vị trí');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error;
      toast.error(msg || 'Lỗi khi thêm vị trí');
    }
  };

  const getStatusBadge = (status: DeviceStatus) => {
    const statusMap: Record<DeviceStatus, { label: string; color: string; bgColor: string }> = {
      [DeviceStatus.DangSuDung]: { label: 'Đang sử dụng', color: '#ffffff', bgColor: '#198754' },
      [DeviceStatus.DangSuaChua]: { label: 'Đang sửa chữa', color: '#212529', bgColor: '#ffc107' },
      [DeviceStatus.HuHong]: { label: 'Hư hỏng', color: '#ffffff', bgColor: '#dc3545' },
      [DeviceStatus.DaThanhLy]: { label: 'Đã thanh lý', color: '#ffffff', bgColor: '#6c757d' },
      [DeviceStatus.CoHuHong]: { label: 'Có hư hỏng', color: '#ffffff', bgColor: '#fd7e14' },
    };

    const statusInfo = statusMap[status] || { label: 'N/A', color: '#ffffff', bgColor: '#6c757d' };
    return (
      <span 
        style={{ 
          display: 'inline-block',
          padding: '2px 10px',
          fontSize: '0.65rem',
          fontWeight: '600',
          borderRadius: '20px',
          color: statusInfo.color,
          backgroundColor: statusInfo.bgColor,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          minWidth: '70px'
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  // Server-side pagination and sorting: devices are already sorted and sliced by the API
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentDevices = devices;

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <i className="fas fa-sort" style={{ fontSize: '0.8rem', opacity: 0.5, color: '#ffffff' }}></i>;
    }
    return sortOrder === 'asc' 
      ? <i className="fas fa-sort-up text-info"></i>
      : <i className="fas fa-sort-down text-info"></i>;
  };

  const getSortFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      name: 'Tên thiết bị',
      serial: 'Serial',
      warrantyDate: 'Bảo hành đến',
      useDate: 'Ngày sử dụng',
      category: 'Danh mục',
      department: 'Phòng ban',
      status: 'Trạng thái',
    };
    return labels[field] || field;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]); // Clear selection when changing page
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentDevices.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Reset sort when filters change
  useEffect(() => {
    setSortField('name');
    setSortOrder('asc');
  }, [selectedCategory]);

  // Handle table scroll for visual indicators
  useEffect(() => {
    const tableContainer = document.getElementById('devices-table-responsive');
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
    // Also check on resize
    window.addEventListener('resize', handleScroll);

    return () => {
      tableContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [currentDevices]); // Re-run when table content changes



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
    .table td, .table th {
      padding: 0.3rem 0.4rem !important;
      vertical-align: middle !important;
    }
  `;

  return (
    <div className="container-fluid" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
      <style>{headerStyle}</style>
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <h4 className="mb-0 mb-2 mb-md-0">THIẾT BỊ</h4>
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
                className="btn btn-outline-info btn-sm"
                onClick={handleViewHistory}
                title="Xem lịch sử thiết bị"
                aria-label="Xem lịch sử thiết bị"
              >
                <i className="fas fa-history"></i>
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
                className="btn btn-success btn-sm ms-md-1" 
                onClick={() => setShowExportModal(true)}
                title="Xuất Excel danh sách thiết bị"
                aria-label="Xuất Excel"
              >
                <i className="fas fa-file-excel"></i>
              </button>
              <button 
                className="btn btn-white btn-sm border ms-1" 
                onClick={() => {
                  setSelectedCategory(0);
                  setSelectedDepartment(0);
                  setSelectedLocation(0);
                  setSelectedStatus(0);
                  setSearchKeyword('');
                  setCurrentPage(1);
                  loadData();
                  toast.success('Đã tải lại dữ liệu và xóa bộ lọc');
                }}
                title="Tải lại dữ liệu"
                id="reload-devices-btn"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          {/* Filter Section */}
          <div className={`card mb-2 filter-card ${filtersOpen ? 'filter-open' : 'filter-collapsed'}`} style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <div className="card-body py-2 px-2 px-md-3">
              <div className="row g-2 align-items-center">
                {/* Category Filter */}
                <div className="col-12 col-md-auto order-last order-md-first">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Danh mục:</span>
                    </div>
                    <select
                      className="form-select form-select-sm flex-grow-1"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(Number(e.target.value))}
                      style={{ borderRadius: '6px', width: '100%', minWidth: '120px' }}
                    >
                      <option value="0">Tất cả</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Department Filter */}
                <div className="col-12 col-md-auto order-last order-md-first">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Phòng ban:</span>
                    </div>
                    <select
                      className="form-select form-select-sm flex-grow-1"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(Number(e.target.value))}
                      style={{ borderRadius: '6px', width: '100%', minWidth: '120px' }}
                    >
                      <option value="0">Tất cả</option>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location Filter */}
                <div className="col-12 col-md-auto order-last order-md-first">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Vị trí:</span>
                    </div>
                    <select
                      className="form-select form-select-sm flex-grow-1"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(Number(e.target.value))}
                      style={{ borderRadius: '6px', width: '100%', minWidth: '120px' }}
                    >
                      <option value="0">Tất cả</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Filter */}
                <div className="col-12 col-md-auto order-last order-md-first">
                  <div className="d-flex align-items-center gap-2">
                    <div style={{ width: '85px' }}>
                      <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: '0.75rem' }}>Trạng thái:</span>
                    </div>
                    <select
                      className="form-select form-select-sm flex-grow-1"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(Number(e.target.value) as DeviceStatus | 0)}
                      style={{ borderRadius: '6px', width: '100%', minWidth: '120px' }}
                    >
                      <option value="0">Tất cả</option>
                      <option value={DeviceStatus.DangSuDung}>Đang sử dụng</option>
                      <option value={DeviceStatus.DangSuaChua}>Đang sửa chữa</option>
                      <option value={DeviceStatus.CoHuHong}>Có hư hỏng</option>
                      <option value={DeviceStatus.HuHong}>Hư hỏng không dùng được</option>
                      <option value={DeviceStatus.DaThanhLy}>Đã thanh lý</option>
                    </select>
                  </div>
                </div>

                {/* Search Bar + Clear Filter Button */}
                <div className="col order-first order-md-last flex-grow-1" style={{ minWidth: '250px' }}>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="fas fa-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Tìm kiếm theo tên, serial, mô tả, vị trí..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      onClick={() => {
                        setSelectedCategory(0);
                        setSelectedDepartment(0);
                        setSelectedLocation(0);
                        setSelectedStatus(0);
                        setSearchKeyword('');
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
                Hiển thị {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)} của {totalItems} thiết bị
                {(selectedCategory > 0 || selectedDepartment > 0 || selectedStatus > 0 || searchKeyword.trim()) && (
                  <span className="text-muted"> (đã lọc)</span>
                )}
                {sortField && (
                  <span className="text-muted ms-2 d-none d-lg-inline">
                    <i className="fas fa-sort"></i> Sắp xếp: {getSortFieldLabel(sortField)} ({sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="card-body p-0 p-md-3" style={{ padding: 0 }}>
          {/* Scroll hint for mobile */}

          <div className="table-scroll-hint mb-1 text-center" style={{ fontSize: '0.8rem', color: '#6c757d' }}>
            <i className="fas fa-arrows-alt-h me-1"></i> Cuộn ngang để xem thêm
          </div>
          <div 
            className="table-responsive" 
            id="devices-table-responsive"
            style={{
              overflowX: 'auto',
              overflowY: 'visible',
              WebkitOverflowScrolling: 'touch',
              position: 'relative',
              width: '100%',
              display: 'block',
              scrollBehavior: 'smooth',
              touchAction: 'pan-x',
              minHeight: '600px',
              maxWidth: '100%'
            }}
          >
            <table 
              className="table table-striped table-hover mb-0" 
              style={{ 
                tableLayout: 'auto',
                marginBottom: 0,
                display: 'table',
                width: 'max-content',
                minWidth: 'max-content'
              }}
            >
              <thead className="table-dark dashboard-table-header" style={{ backgroundColor: '#2c3e50' }}>
                <tr style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.8rem' }}>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === currentDevices.length && currentDevices.length > 0 && selectedIds.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Tên thiết bị</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('serial')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Serial/mã nhận dạng</span>
                      {getSortIcon('serial')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('warrantyDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Bảo hành đến</span>
                      {getSortIcon('warrantyDate')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('useDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Ngày sử dụng</span>
                      {getSortIcon('useDate')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('category')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Danh mục</span>
                      {getSortIcon('category')}
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
                  <th style={{ minWidth: '120px' }}>Vị trí</th>
                  <th 
                    style={{ minWidth: '150px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('status')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Trạng thái</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th style={{ minWidth: '180px' }}>Tình trạng báo cáo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      <span className="text-muted">Đang tải dữ liệu...</span>
                    </td>
                  </tr>
                ) : currentDevices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentDevices.map((device) => (
                    <tr key={device.id} style={{ fontSize: '0.8rem', verticalAlign: 'middle' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(device.id)}
                          onChange={() => handleCheckboxChange(device.id)}
                        />
                      </td>
                      <td>{device.name}</td>
                      <td>{device.serial || '-'}</td>
                      <td>
                        {device.warrantyDate
                          ? formatDateDisplay(device.warrantyDate)
                          : '-'}
                      </td>
                      <td>
                        {device.useDate
                          ? formatDateDisplay(device.useDate)
                          : '-'}
                      </td>
                      <td>{device.deviceCategoryName}</td>
                      <td>{device.departmentName}</td>
                      <td>
                        {device.locationName 
                          ? <><i className="fas fa-map-marker-alt text-muted me-1" style={{ fontSize: '0.75rem' }}></i>{device.locationName}</>
                          : <span className="text-muted">-</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{getStatusBadge(device.status)}</td>
                      <td>
                        {device.lastReportId ? (
                          <div 
                            className="d-flex flex-column gap-1" 
                            style={{ cursor: 'pointer', maxWidth: '250px' }}
                            onClick={() => handleQuickViewReport(device.lastReportId!)}
                          >
                            <div className="d-flex align-items-center gap-1">
                              <span className={getReportStatusBadgeClass(device.lastReportStatus!)} style={{ fontSize: '0.65rem' }}>
                                {device.lastReportStatus === DamageReportStatus.Pending ? 'Chờ xử lý' :
                                 device.lastReportStatus === DamageReportStatus.Assigned ? 'Đã phân công' :
                                 device.lastReportStatus === DamageReportStatus.InProgress ? 'Đang xử lý' :
                                 device.lastReportStatus === DamageReportStatus.Completed ? 'Hoàn thành' :
                                 device.lastReportStatus === DamageReportStatus.Cancelled ? 'Hủy' :
                                 device.lastReportStatus === DamageReportStatus.Rejected ? 'Từ chối' : 'KĐ'}
                              </span>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>#{device.lastReportId}</small>
                            </div>
                            <div 
                              className="text-truncate small text-primary" 
                              style={{ fontSize: '0.75rem', textDecoration: 'underline' }}
                              title={device.lastReportContent || ''}
                            >
                              {device.lastReportContent || 'Xem chi tiết'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted small">Chưa có báo cáo</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
        </div>
        {/* Pagination Sticky Footer */}
        {totalPages > 1 && (
          <div 
            className="card-footer bg-white border-top sticky-bottom py-3 shadow-lg" 
            style={{ 
              zIndex: 10, 
              borderBottomLeftRadius: '12px', 
              borderBottomRightRadius: '12px',
              marginTop: '-1px'
            }}
          >
            <nav aria-label="Page navigation">
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
                            <span className="page-link bg-transparent border-0">...</span>
                          </li>
                        )}
                        <li className={`page-item ${currentPage === page ? 'active' : ''}`}>
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
                      </React.Fragment>
                    );
                  });
                })()}
                
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

      {/* Modal */}
      {showModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {isEdit ? 'Cập nhật thiết bị' : 'Thêm mới thiết bị'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12 col-md-6">
                    <div className="form-group mb-3">
                      <label>Danh mục</label>
                      <select
                        className="form-control"
                        value={formData.deviceCategoryId}
                        onChange={(e) =>
                          setFormData({ ...formData, deviceCategoryId: Number(e.target.value) })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-3">
                      <label>Phòng ban <span className="text-muted small">(Đơn vị quản lý)</span></label>
                      <select
                        className="form-control"
                        value={formData.departmentId}
                        onChange={(e) =>
                          setFormData({ ...formData, departmentId: Number(e.target.value) })
                        }
                      >
                        {departments.map((dep) => (
                          <option key={dep.id} value={dep.id}>
                            {dep.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-3">
                      <label>Vị trí <span className="text-muted small">(Nơi đặt thiết bị)</span></label>
                      <div className="input-group">
                        <SearchableSelect
                          className="form-control"
                          options={locations}
                          value={formData.locationId || 0}
                          onChange={(val: number) =>
                            setFormData({ ...formData, locationId: val })
                          }
                          placeholder="— Chưa xác định —"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-success"
                          title="Thêm nhanh vị trí mới"
                          onClick={() => { setQuickAddLocationName(''); setShowQuickAddLocation(true); }}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                    </div>
                    <div className="form-group mb-3">
                      <label>Tên thiết bị *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group mb-3">
                      <label>Serial (nếu có)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.serial}
                        onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>Ngày hết BH</label>
                          <DateInput
                            value={formData.warrantyDate}
                            onChange={(value) =>
                              setFormData({ ...formData, warrantyDate: value })
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>Ngày sử dụng</label>
                          <DateInput
                            value={formData.useDate}
                            onChange={(value) =>
                              setFormData({ ...formData, useDate: value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group mb-3">
                      <label>Hình ảnh</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={formData.img || ''}
                          onChange={(e) => {
                            console.log('Input onChange:', e.target.value);
                            setFormData((prev) => ({ ...prev, img: e.target.value }));
                          }}
                          placeholder="Đường dẫn ảnh"
                          readOnly={false}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => {
                            setFileManagerMode('image');
                            setFileManagerCallback((url: string) => {
                              if (!url) return;
                              
                              // Giữ nguyên URL (hỗ trợ Vercel Blob và absolute URLs)
                              setFormData((prev) => ({ ...prev, img: url.trim() }));
                            });
                            fileManagerCallbackRef.current = (url: string) => {
                              if (!url) return;
                              setFormData((prev) => ({ ...prev, img: url.trim() }));
                            };
                            setShowFileManager(true);
                          }}
                          title="Chọn ảnh từ thư viện"
                        >
                          <i className="fas fa-image"></i> Chọn ảnh
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-info"
                          disabled={!formData.img}
                          onClick={() => setShowImagePreview((prev) => !prev)}
                          title={showImagePreview ? 'Ẩn ảnh' : 'Xem ảnh'}
                          aria-pressed={showImagePreview}
                        >
                          <i className={showImagePreview ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                        </button>
                      </div>
                      {showImagePreview && formData.img && (
                        <div className="mt-2">
                          <div className="image-preview-box">
                            <img
                              src={formData.img}
                              alt="Preview"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="image-preview-caption">{formData.img}</div>
                        </div>
                      )}
                    </div>
                    <div className="form-group mb-3">
                      <label>Trạng thái</label>
                      <select
                        className="form-control"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: Number(e.target.value) as DeviceStatus })
                        }
                      >
                        <option value={DeviceStatus.DangSuDung}>Đang sử dụng</option>
                        <option value={DeviceStatus.DangSuaChua}>Đang sửa chữa</option>
                        <option value={DeviceStatus.CoHuHong}>Có hư hỏng</option>
                        <option value={DeviceStatus.HuHong}>Hư hỏng không dùng được</option>
                        <option value={DeviceStatus.DaThanhLy}>Đã thanh lý</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="form-group mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label>Mô tả</label>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            if (showHtmlSource) {
                              // Switching from HTML source to editor
                              const newDesc = htmlSource || '';
                              setFormData((prev) => ({ ...prev, description: newDesc }));
                              setQuillValue(newDesc);
                            } else {
                              // Switching from editor to HTML source
                              setHtmlSource(quillValue || '');
                            }
                            setShowHtmlSource(!showHtmlSource);
                          }}
                        >
                          <i className={`fas ${showHtmlSource ? 'fa-eye' : 'fa-code'}`}></i>
                          {showHtmlSource ? ' Xem Preview' : ' Xem HTML Source'}
                        </button>
                      </div>
                      {showHtmlSource ? (
                        <textarea
                          className="form-control"
                          rows={10}
                          value={htmlSource}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setHtmlSource(newValue);
                            setFormData((prev) => ({ ...prev, description: newValue }));
                            setQuillValue(newValue);
                          }}
                          style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.9rem',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Nhập HTML source code..."
                        />
                      ) : (
                        <div className="quill-editor">
                          <ReactQuill
                            key={`quill-${showModal}-${isEdit}`}
                            theme="snow"
                            value={quillValue || ''}
                            onChange={(value) => {
                              // Ensure value is always a string
                              const safeValue = typeof value === 'string' ? value : '';
                              setQuillValue(safeValue);
                              setFormData((prev) => ({ ...prev, description: safeValue }));
                            }}
                            preserveWhitespace={false}
                            modules={quillModules}
                            formats={[
                              'header',
                              'bold', 'italic', 'underline', 'strike',
                              'list', 'bullet',
                              'color', 'background',
                              'align',
                              'link', 'image'
                            ]}
                            style={{ marginBottom: '16px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
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

      {/* Quick Add Location Modal */}
      {showQuickAddLocation && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }} tabIndex={-1}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">
                  <i className="fas fa-plus-circle me-2 text-success"></i>Thêm nhanh Vị trí
                </h6>
                <button type="button" className="btn-close" onClick={() => setShowQuickAddLocation(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label small">Tên vị trí / Khu vực <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={quickAddLocationName}
                    onChange={e => setQuickAddLocationName(e.target.value)}
                    placeholder="Ví dụ: Bếp, Sảnh, Kho..."
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickAddLocation(); }}
                  />
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowQuickAddLocation(false)}>Hủy</button>
                <button type="button" className="btn btn-success btn-sm" onClick={handleQuickAddLocation}>
                  <i className="fas fa-save me-1"></i>Lưu & Chọn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* File Manager Modal */}
      <FileManager
        isOpen={showFileManager}
        onClose={() => {
          setShowFileManager(false);
          setFileManagerCallback(null);
          fileManagerCallbackRef.current = null;
        }}
        onSelectFile={(url) => {
          console.log('FileManager onSelectFile called with:', url);
          if (!url) {
            console.log('URL is empty or null');
            setShowFileManager(false);
            setFileManagerCallback(null);
            return;
          }
          
          // Store callback before any state changes; prefer ref to avoid race
          const callback = fileManagerCallbackRef.current || fileManagerCallback;
          
          // Call callback immediately with URL to update appropriate target
          if (callback) {
            console.log('Calling fileManagerCallback with:', url);
            try {
              // Execute callback synchronously
              callback(url);
              console.log('Callback executed successfully');
              // Explicitly clear pending to ensure description-only insertions don't affect image field
              pendingImageUrl.current = null;
            } catch (error) {
              console.error('Error in fileManagerCallback:', error);
            }
          } else {
            console.error('No fileManagerCallback set! Using pending URL fallback.');
            // Only set pending URL when there is no specific callback
            pendingImageUrl.current = url;
          }
          
          // Close modal - this will trigger useEffect to process pending URL
          setShowFileManager(false);
          
          // Clear callback after delay
          setTimeout(() => {
            setFileManagerCallback(null);
            fileManagerCallbackRef.current = null;
          }, 500);
        }}
        mode={fileManagerMode}
        accept={fileManagerMode === 'image' ? 'image/*' : undefined}
        multiSelect={false}
        canManageFiles
      />

      {showHistoryModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-history me-2"></i>
                  Lịch sử thiết bị
                </h5>
                <button type="button" className="btn-close" onClick={closeHistoryModal}></button>
              </div>
              <div className="modal-body">
                {historyLoading ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                  </div>
                ) : !historyData ? (
                  <div className="text-center text-muted py-4">
                    Không có dữ liệu lịch sử.
                  </div>
                ) : (
                  <div className="d-flex flex-column" style={{ gap: '1.25rem' }}>
                    <div className="border rounded p-3 bg-light">
                      <div className="fw-semibold" style={{ fontSize: '1rem' }}>
                        {historyData.deviceName || 'Thiết bị không xác định'}
                        {historyData.deviceSerial ? ` • Serial: ${historyData.deviceSerial}` : ''}
                      </div>
                      <div className="text-muted small mt-2">
                        Tổng báo cáo: <strong>{historyData.totalReports}</strong>
                        {' • '}
                        Tổng sự kiện: <strong>{historyData.totalEvents}</strong>
                      </div>
                    </div>

                    <div>
                      <h6 className="fw-semibold mb-2">Sự kiện của thiết bị</h6>
                      {historyData.events.length === 0 ? (
                        <div className="text-muted small">
                          Chưa ghi nhận sự kiện nào.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Loại</th>
                                <th>Tiêu đề</th>
                                <th>Trạng thái</th>
                                <th>Ngày báo</th>
                                <th>Ngày hoàn thành</th>
                                <th>Báo cáo liên quan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyData.events.map((event) => (
                                <tr key={event.id}>
                                  <td>
                                    {event.eventTypeName ? (
                                      <span className="badge bg-info text-dark">
                                        {event.eventTypeName}
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td>
                                    <div className="fw-semibold">{event.title || '—'}</div>
                                    {event.description && (
                                      <div className="text-muted small text-truncate" style={{ maxWidth: '250px' }} title={event.description.replace(/<[^>]*>?/gm, '')}>
                                        {event.description.replace(/<[^>]*>?/gm, '')}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span className={getEventStatusBadgeClass(event.status)}>
                                      {event.statusLabel}
                                    </span>
                                  </td>
                                  <td>{formatDateTimeLocal(event.reportedAt)}</td>
                                  <td>{formatDateTime(event.completedAt)}</td>
                                  <td>
                                    {event.relatedReportId ? (
                                      <div className="d-flex flex-column gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 fw-bold d-block text-start"
                                          onClick={() => handleQuickViewReport(event.relatedReportId!)}
                                          style={{ textDecoration: 'none' }}
                                        >
                                          #{event.relatedReportId}
                                        </button>
                                        <div className="text-muted small">
                                          {event.reportStatusName || 'Không rõ trạng thái'}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div>
                      <h6 className="fw-semibold mb-2">Báo cáo</h6>
                      {historyData.reports.length === 0 ? (
                        <div className="text-muted small">
                          Thiết bị chưa có báo cáo nào.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Mã</th>
                                <th>Ngày báo</th>
                                <th>Ngày hoàn thành</th>
                                <th>Trạng thái</th>
                                <th>Phân loại công việc</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyData.reports.map((report) => (
                                <tr key={report.reportId}>
                                  <td className="fw-semibold">
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 fw-semibold"
                                      onClick={() => handleQuickViewReport(report.reportId)}
                                    >
                                      #{report.reportId}
                                    </button>
                                  </td>
                                  <td>{formatDateTimeLocal(report.reportDate)}</td>
                                  <td>{formatDateTime(report.completedDate)}</td>
                                  <td>
                                    <span className={getReportStatusBadgeClass(report.status)}>
                                      {report.statusName}
                                    </span>
                                  </td>
                                  <td>
                                    <div>{report.eventTypeName || '—'}</div>
                                    {report.damageContent && (
                                      <div className="text-muted small mt-1 text-truncate" style={{ maxWidth: '250px' }} title={report.damageContent.replace(/<[^>]*>?/gm, '')}>
                                        {report.damageContent.replace(/<[^>]*>?/gm, '')}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-between align-items-center">
                <button 
                  type="button" 
                  className="btn btn-success d-flex align-items-center" 
                  onClick={handleExportHistoryExcel}
                  disabled={!historyData || historyLoading}
                  title="Xuất lịch sử vòng đời ra file Excel"
                >
                  <i className="fas fa-file-excel me-1"></i>
                  <span>Xuất Excel</span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeHistoryModal}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuickViewReportModal
        isOpen={showQuickView}
        reportId={selectedReportId || 0}
        onClose={() => setShowQuickView(false)}
      />

      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Xuất Excel - Danh sách thiết bị"
        apiEndpoint="/devices/export"
        params={{
          cateId: selectedCategory,
          departmentId: selectedDepartment,
          locationId: selectedLocation,
          status: selectedStatus,
          keyword: searchKeyword
        }}
        filterOptions={{
          categories: categories.map(c => ({ id: c.id, name: c.name })),
          departments: departments.map(d => ({ id: d.id, name: d.name })),
          locations: locations.map(l => ({ id: l.id, name: l.name })),
          statuses: [
            { id: 1, name: 'Đang sử dụng' },
            { id: 2, name: 'Đang sửa chữa' },
            { id: 3, name: 'Hư hỏng' },
            { id: 4, name: 'Đã thanh lý' },
            { id: 5, name: 'Có hư hỏng' },
          ]
        }}
        defaultFileName="Danh_sach_thiet_bi"
      />
    </div>
  );
}

export default function DevicesPage() {
  return (
    <AdminRoute>
      <DevicesPageContent />
    </AdminRoute>
  );
}

