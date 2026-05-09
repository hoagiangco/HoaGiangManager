'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { exportToExcel } from '@/lib/utils/excelExporter.client';
import Loading from '@/components/Loading';

// --- Configuration Constants ---

// Helper: get today's date as 'YYYY-MM-DD' in LOCAL timezone
const getLocalDateStr = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getFirstDayOfMonthStr = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const formatVietnameseDate = (dateStr: string) => {
  if (!dateStr || dateStr === '-' || dateStr === '') return '-';
  
  // Handle ISO strings or YYYY-MM-DD
  const isoMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch (e) {
    return dateStr;
  }
};

// Vietnamese Label Mapping for Table Columns
const columnLabels: Record<string, string> = {
  'stt': 'STT',
  'id': 'Mã số',
  'deviceAndLocation': 'Thiết bị',
  'deviceSerial': 'Số Serial',
  'deviceLocationName': 'Vị trí thiết bị',
  'deviceCategoryName': 'Loại thiết bị',
  'reporterName': 'Người báo cáo',
  'reportingDepartmentId': 'Mã PB',
  'handlerName': 'Người xử lý',
  'reportDate': 'Ngày báo',
  'handlingDate': 'Ngày xử lý',
  'completedDate': 'Ngày xong',
  'damageContent': 'Nội dung sự cố',
  'statusName': 'Trạng thái',
  'priorityName': 'Mức độ',
  'notes': 'Ghi chú',
  'handlerNotes': 'Tiến độ xử lý',
  'dailyCategory': 'Phân loại',
  'workNotes': 'Ghi chú công việc',
  'checkinStaffName': 'Người điểm danh',
  // Lowercase versions for robustness
  'reportername': 'Người báo cáo',
  'handlername': 'Người xử lý',
  'reportdate': 'Ngày báo',
  'statusname': 'Trạng thái',
  'priorityname': 'Mức độ',
  'handlernotes': 'Tiến độ xử lý',
  'devicelocationname': 'Vị trí thiết bị'
};

const columnBlacklist = [
  'deviceid', 'reporterid', 'handlerid', 'reportingdepartmentid', 
  'status', 'priority', 'images', 'afterimages', 'maintenancebatchid', 
  'createdby', 'updatedby', 'createdat', 'updatedat', 'rejectionreason',
  'devicestatus', 'dayssincereport', 'daysinprogress', 'isoverdue', 
  'reporterdepartmentname', 'handlerdepartmentname', 'updatedbyname',
  'deviceserial', 'notes', 'dailycategory', 'worknotes', 'checkinstaffname',
  'deviceLocationName', 'deviceCategoryName', 'devicelocationname', 'devicecategoryname',
  'deviceid', 'reporterid', 'handlerid', 'reportingDepartmentId', 'maintenanceBatchId',
  'afterImages', 'rejectionReason', 'createdBy', 'updatedBy', 'updatedByName',
  'deviceName', 'damageLocation', 'devicename', 'damagelocation'
];

const defaultReportColumnOrder = [
  'stt', 'deviceAndLocation', 'reportDate', 'damageContent', 'statusName', 'priorityName', 'handlerName', 'completedDate'
];

const defaultDeviceColumnOrder = [
  'stt', 'deviceName', 'deviceSerial', 'deviceCategoryName', 'deviceLocationName', 'statusName'
];

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<'devices' | 'reports'>('reports');
  
  // States for local filters
  const [deviceFilters, setDeviceFilters] = useState({ deptId: 0, locId: 0, categoryId: 0, status: 0, search: '' });
  const [reportFilters, setReportFilters] = useState({ 
    deptId: 0, 
    staffId: 0, 
    locId: 0, 
    fromDate: getLocalDateStr(), // Default to today for dailyMode: true
    toDate: getLocalDateStr(),
    status: 0, 
    priority: 0,
    search: '', 
    maintenanceBatchId: '',
    dailyMode: true,
    dailyCategory: 'all' // all, pending, completed, backlog, priority
  });

  // Pagination states
  const [reportPage, setReportPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Preview toggle states
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({ reports: true });
  const [isExporting, setIsExporting] = useState(false);

  // Static data loading
  const { data: deptData } = useSWR('/departments', fetcher);
  const departments = deptData?.data || [];
  const { data: locData } = useSWR('/locations', fetcher);
  const locations = locData?.data || [];
  const { data: catData } = useSWR('/device-categories', fetcher);
  const categories = catData?.data || [];
  const { data: batchesData } = useSWR('/events/maintenance-batches?all=true', fetcher);
  const maintenanceBatches = batchesData?.data || [];

  // Staff list depends on selected department
  const { data: staffData } = useSWR(activeTab === 'reports' ? `/staff?departmentId=${reportFilters.deptId}` : null, fetcher);
  const staffList = staffData?.data || [];

  // Reset pagination when filters change
  useEffect(() => {
    setReportPage(1);
  }, [reportFilters]);



  // Summary Data fetch logic
  const getSummaryUrl = (tab: string, filters: any) => {
    const params = new URLSearchParams();
    if (filters.deptId > 0) params.append('departmentId', filters.deptId.toString());
    if (filters.locId > 0) params.append('locationId', filters.locId.toString());
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.categoryId > 0) params.append('categoryId', filters.categoryId.toString());
    if (filters.status > 0) params.append('status', filters.status.toString());
    if (filters.search) params.append('search', filters.search);
    if (tab === 'reports') {
      if (filters.staffId > 0) params.append('handlerId', filters.staffId.toString());
      if (filters.maintenanceBatchId) params.append('maintenanceBatchId', filters.maintenanceBatchId);
    }
    return `/statistics/summary?${params.toString()}`;
  };

  const { data: deviceSummary } = useSWR(getSummaryUrl('devices', deviceFilters), fetcher);
  const { data: reportSummary } = useSWR(!reportFilters.dailyMode ? getSummaryUrl('reports', reportFilters) : null, fetcher);

  // Preview Data fetch logic
  const getPreviewUrl = (tab: string, filters: any) => {
    if (!showPreview[tab]) return null;
    const params = new URLSearchParams();
    params.append('type', tab);
    if (filters.deptId > 0) params.append('departmentId', filters.deptId.toString());
    if (filters.locId > 0) params.append('locationId', filters.locId.toString());
    
    // In dailyMode, fromDate will be added below. For normal mode, add here.
    if (!filters.dailyMode) {
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
    }
    if (filters.categoryId > 0) params.append('categoryId', filters.categoryId.toString());
    if (filters.status > 0) params.append('status', filters.status.toString());
    
    if (filters.search) {
      params.append('search', filters.search);
      if (tab === 'reports') params.append('keyword', filters.search);
    }
    
    if (tab === 'reports') {
      if (filters.staffId > 0) params.append('handlerId', filters.staffId.toString());
      if (filters.maintenanceBatchId) params.append('maintenanceBatchId', filters.maintenanceBatchId);
      
      if (filters.dailyMode) {
        // Use local date string (not UTC) to avoid timezone shift
        params.append('fromDate', filters.fromDate || getLocalDateStr());
        params.append('dailyMode', 'true');
        params.append('category', filters.dailyCategory);
      }
    }
    
    // Different endpoint for reports
    const endpoint = tab === 'reports' ? '/damage-reports/export' : '/statistics/export';
    params.append('preview', 'true');
    
    return `${endpoint}?${params.toString()}`;
  };

  const { data: deviceList, isLoading: devListLoading } = useSWR(getPreviewUrl('devices', deviceFilters), fetcher);
  const { data: reportListResponse, isLoading: repListLoading } = useSWR(getPreviewUrl('reports', reportFilters), fetcher);
  
  // Normalize report list for pagination
  const reportList = useMemo(() => {
     if (!reportListResponse?.data) return { data: [], total: 0 };
     
     // Sort newest first based on reportDate or createdAt
     const sortedData = [...reportListResponse.data].sort((a: any, b: any) => {
       const dateA = new Date(a.reportDate || a.createdAt || 0).getTime();
       const dateB = new Date(b.reportDate || b.createdAt || 0).getTime();
       return dateB - dateA;
     });

     return {
       data: sortedData,
       total: reportListResponse.recordCount || reportListResponse.data.length
     };
  }, [reportListResponse]);

  const reportListPaginated = useMemo(() => {
     const start = (reportPage - 1) * pageSize;
     return reportList.data.slice(start, start + pageSize);
  }, [reportList.data, reportPage, pageSize]);

  const togglePreview = (tab: string) => {
    setShowPreview(prev => ({ ...prev, [tab]: !prev[tab] }));
  };

  // --- Column Configuration State ---
  type ColMeta = { id: string, visible: boolean };
  const [colsDevice, setColsDevice] = useState<ColMeta[]>([]);
  const [colsReport, setColsReport] = useState<ColMeta[]>([]);
  const [colDropdownTab, setColDropdownTab] = useState<string | null>(null);

  // Persistence Helpers
  const saveCols = (key: string, cols: ColMeta[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(cols));
    }
  };

  const loadCols = (key: string): ColMeta[] | null => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  };

  // Initialize columns when data arrives and config is empty
  useEffect(() => {
    if (deviceList?.data && deviceList.data.length > 0 && colsDevice.length === 0) {
      const saved = loadCols('hg_cols_device');
      
      // Always filter out blacklisted items from saved config
      let filteredSaved = saved ? saved.filter(c => 
        !columnBlacklist.includes(c.id) && 
        !columnBlacklist.includes(c.id.toLowerCase())
      ) : null;

      // Auto-migration: Add STT if missing
      if (filteredSaved && !filteredSaved.some(c => c.id === 'stt')) {
        filteredSaved = [{ id: 'stt', visible: true }, ...filteredSaved];
        saveCols('hg_cols_device', filteredSaved);
      }

      if (filteredSaved && filteredSaved.length > 0) {
        setColsDevice(filteredSaved);
        return;
      }

      const keys = Object.keys(deviceList.data[0]);
      
      const initialColsBase = defaultDeviceColumnOrder
        .filter(id => keys.includes(id))
        .map(id => ({ id, visible: true }));

      const otherKeys = keys.filter(k => 
        !defaultDeviceColumnOrder.includes(k) && 
        !columnBlacklist.includes(k) && 
        !columnBlacklist.includes(k.toLowerCase()) &&
        !k.toLowerCase().endsWith('id')
      );
      
      const initialCols = [...initialColsBase, ...otherKeys.map(k => ({ id: k, visible: false }))];
      setColsDevice(initialCols);
      saveCols('hg_cols_device', initialCols);
    }
  }, [deviceList]);
  
  useEffect(() => {
    if (reportList?.data && reportList.data.length > 0 && colsReport.length === 0) {
      const saved = loadCols('hg_cols_report');
      
      // Auto-migration: If old config exists with separate deviceName/damageLocation, migrate to merged column
      let finalSaved = saved;
      if (saved && Array.isArray(saved)) {
        const hasDevice = saved.some(c => c.id === 'deviceName' && c.visible);
        const hasLocation = saved.some(c => c.id === 'damageLocation' && c.visible);
        const hasMerged = saved.some(c => c.id === 'deviceAndLocation');

        if ((hasDevice || hasLocation) && !hasMerged) {
          // Find index of deviceName or damageLocation to insert merged column there
          const insertIdx = saved.findIndex(c => c.id === 'deviceName' || c.id === 'damageLocation');
          const newCols = [...saved];
          // Insert merged column
          newCols.splice(insertIdx, 0, { id: 'deviceAndLocation', visible: true });
          // Hide old ones
          finalSaved = newCols.map(c => {
            if (c.id === 'deviceName' || c.id === 'damageLocation') return { ...c, visible: false };
            return c;
          });
          saveCols('hg_cols_report', finalSaved);
        }

        // Auto-migration: Add STT if missing
        if (finalSaved && !finalSaved.some(c => c.id === 'stt')) {
          finalSaved = [{ id: 'stt', visible: true }, ...finalSaved];
          saveCols('hg_cols_report', finalSaved);
        }
      }

      if (finalSaved) {
        // Always filter out blacklisted items even from saved config
        const filteredSaved = finalSaved.filter(c => 
          !columnBlacklist.includes(c.id) && 
          !columnBlacklist.includes(c.id.toLowerCase())
        );
        setColsReport(filteredSaved);
        return;
      }

      const keys = Object.keys(reportList.data[0]);
      
      const initialColsBase = defaultReportColumnOrder
        .map(id => {
           if (id === 'deviceAndLocation') return { id, visible: true };
           if (keys.includes(id)) return { id, visible: true };
           return null;
        })
        .filter(Boolean) as ColMeta[];
        
      const otherKeys = keys.filter(k => 
        !defaultReportColumnOrder.includes(k) && 
        !columnBlacklist.includes(k) && 
        !columnBlacklist.includes(k.toLowerCase()) &&
        !k.toLowerCase().endsWith('id')
      );
      
      const allCols = [...initialColsBase, ...otherKeys.map(k => ({ id: k, visible: false }))];
      
      // Cleanup: If deviceAndLocation is present and visible, hide separate deviceName/damageLocation
      const finalCols = allCols.map(c => {
        if ((c.id === 'deviceName' || c.id === 'damageLocation') && initialColsBase.some(ic => ic.id === 'deviceAndLocation')) {
          return { ...c, visible: false };
        }
        return c;
      });

      setColsReport(finalCols);
      saveCols('hg_cols_report', finalCols);
    }
  }, [reportList]);
  
  // Handle URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const staffId = params.get('handlerId');
    const deptId = params.get('deptId');
    const tab = params.get('tab');

    if (tab === 'reports') {
      setActiveTab('reports');
    }

    if (mode === 'daily') {
      setReportFilters(prev => ({ 
        ...prev, 
        dailyMode: true,
        fromDate: getLocalDateStr(),
        toDate: getLocalDateStr()
      }));
      setShowPreview(prev => ({ ...prev, reports: true }));
    }

    if (staffId) {
      setReportFilters(prev => ({ ...prev, staffId: Number(staffId) }));
    }
    if (deptId) {
      setReportFilters(prev => ({ ...prev, deptId: Number(deptId) }));
    }
  }, []);

  // Export Logic Directly
  const handleExport = async (tab: string, filters: any, cols: ColMeta[]) => {
    setIsExporting(true);
    let toastId = toast.loading('Đang chuẩn bị dữ liệu xuất...');
    try {
      const params = new URLSearchParams();
      params.append('type', tab);
      if (filters.deptId > 0) params.append('departmentId', filters.deptId.toString());
      if (filters.locId > 0) params.append('locationId', filters.locId.toString());
      if (filters.categoryId > 0) params.append('categoryId', filters.categoryId.toString());
      if (filters.status > 0) params.append('status', filters.status.toString());
      if (filters.search) {
        params.append('search', filters.search);
        if (tab === 'reports') params.append('keyword', filters.search);
      }
      
      if (tab === 'reports') {
        if (filters.staffId > 0) params.append('handlerId', filters.staffId.toString());
        if (filters.maintenanceBatchId) params.append('maintenanceBatchId', filters.maintenanceBatchId);
        if (filters.dailyMode) {
          params.append('fromDate', filters.fromDate || getLocalDateStr());
          params.append('dailyMode', 'true');
          params.append('category', filters.dailyCategory);
        } else {
          if (filters.fromDate) params.append('fromDate', filters.fromDate);
          if (filters.toDate) params.append('toDate', filters.toDate);
        }
      } else {
        if (filters.fromDate) params.append('fromDate', filters.fromDate);
        if (filters.toDate) params.append('toDate', filters.toDate);
      }
      
      const endpoint = tab === 'reports' ? '/damage-reports/export' : '/statistics/export';
      
      // Always use server-side Excel for Reports tab to get professional formatting (sections, landscape, etc.)
      if (tab === 'reports') {
        const response = await api.get(`${endpoint}?${params.toString()}`, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Generate a nice filename
        let fileName = 'Bao_Cao_Cong_Viec';
        if (filters.dailyMode) {
          fileName = `Bao_Cao_Ngay_${filters.fromDate || getLocalDateStr()}`;
        } else {
          fileName = `Bao_Cao_Tong_Hop_${filters.fromDate || ''}_den_${filters.toDate || ''}`;
        }
        
        link.setAttribute('download', `${fileName}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.update(toastId, { render: 'Xuất Excel thành công!', type: 'success', isLoading: false, autoClose: 3000 });
        return;
      }

      // Fallback for other tabs (Devices)
      params.append('preview', 'true'); 
      const response = await api.get(`${endpoint}?${params.toString()}`);
      
      if (!response.data.status) throw new Error(response.data.error || 'Lỗi lấy dữ liệu export');
      
      const exportData = response.data.data || [];
      if (exportData.length === 0) {
        toast.update(toastId, { render: 'Không có dữ liệu để xuất', type: 'warning', isLoading: false, autoClose: 3000 });
        return;
      }

      const visibleColIds = cols.filter(c => c.visible).map(c => c.id);
      const titlePrefix = 'THIẾT BỊ';
      
      const columns = visibleColIds.map(id => ({
        id: id,
        label: columnLabels[id] || columnLabels[id.toLowerCase()] || id,
        width: id === 'handlerNotes' || id === 'damageContent' || id === 'notes' || id === 'deviceAndLocation' ? 50 : 20
      }));

      const formattedData = exportData.map((row: any) => {
        const newRow: any = {};
        visibleColIds.forEach(id => {
          let val = row[id];
          
          if (id === 'deviceAndLocation') {
            const dev = row.deviceName || row.DeviceName;
            const loc = row.damageLocation || row.DamageLocation;
            const content = row.damageContent || '';
            const isMt = row.maintenanceBatchId || content.toLowerCase().includes('bảo trì') || content.toUpperCase().startsWith('BT ');
            
            if (isMt && (!dev || dev === '-')) val = 'Bảo trì';
            else if (dev && dev !== '-') val = dev;
            else if (loc && loc !== '-') val = loc;
            else val = row.deviceLocationName || '-';
          }

          if (id === 'handlerNotes' && typeof val === 'string' && val.startsWith('[')) {
            try {
              const timeline = JSON.parse(val);
              if (Array.isArray(timeline) && timeline.length > 0) {
                val = timeline[timeline.length - 1].content || '';
              }
            } catch (e) {}
          }

          const lowerKey = id.toLowerCase();
          if (lowerKey.includes('date') || lowerKey === 'createdat' || lowerKey === 'updatedat') {
            val = formatVietnameseDate(val);
          }

          newRow[id] = val === null || val === undefined ? '' : val;
        });
        return newRow;
      });

      await exportToExcel({
        title: `THỐNG KÊ CHI TIẾT ${titlePrefix}`,
        filename: `Thống_kê_thiet_bi`,
        columns: columns,
        data: formattedData
      });
      
      toast.update(toastId, { render: 'Xuất Excel thành công!', type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error: any) {
      console.error(error);
      toast.update(toastId, { render: 'Lỗi khi xuất file Excel!', type: 'error', isLoading: false, autoClose: 3000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container-fluid px-3 py-2">
      {/* Page Header - Compact */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Thống kê & Báo cáo</h5>
          <p className="text-muted small mb-0">Dữ liệu thời gian thực và trích xuất chuyên nghiệp</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-0 pt-3 pb-0">
          <ul className="nav nav-pills gap-2 pb-2 border-bottom">
            <li className="nav-item">
              <button 
                className={`nav-link px-4 py-2 fw-bold ${activeTab === 'reports' ? 'active bg-success' : 'text-muted bg-light border'}`}
                onClick={() => setActiveTab('reports')}
                style={{ borderRadius: '8px' }}
              >
                <i className="fas fa-file-invoice me-2"></i>Sự cố & Báo cáo
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link px-4 py-2 fw-bold position-relative ${activeTab === 'devices' ? 'active bg-primary' : 'text-muted bg-light border'}`}
                onClick={() => setActiveTab('devices')}
                style={{ borderRadius: '8px', zIndex: 1 }}
              >
                <i className="fas fa-desktop me-2"></i>Thiết bị
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body pt-3">
          {/* Tab Content: Devices */}
          {activeTab === 'devices' && (
            <div>
              <div className="row g-2 align-items-end mb-4 bg-light p-2 rounded-3 mx-0 border">
                <div className="col-12 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Phòng ban</label>
                  <select 
                    className="form-select form-select-sm border shadow-none"
                    value={deviceFilters.deptId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, deptId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-2">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Vị trí</label>
                   <select 
                    className="form-select form-select-sm border shadow-none"
                    value={deviceFilters.locId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, locId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-2">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Danh mục</label>
                   <select 
                    className="form-select form-select-sm border shadow-none"
                    value={deviceFilters.categoryId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-2">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Trạng thái</label>
                   <select 
                    className="form-select form-select-sm border shadow-none"
                    value={deviceFilters.status}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, status: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    <option value="1">Đang sử dụng</option>
                    <option value="2">Đang sửa chữa</option>
                    <option value="3">Lỗi/Ngưng hoạt động</option>
                    <option value="4">Đã thanh lý</option>
                    <option value="5">Có sự cố</option>
                  </select>
                </div>
                <div className="col-12 col-md">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Tìm kiếm</label>
                   <input 
                    type="text" 
                    className="form-control form-control-sm border shadow-none" 
                    placeholder="Nhập tên hoặc serial..."
                    value={deviceFilters.search}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <div className="col-12 mt-2 d-flex justify-content-end">
                   <div className="d-flex gap-2 position-relative w-100" style={{ maxWidth: '400px' }}>
                     <button className="btn btn-sm btn-outline-primary flex-grow-1 fw-bold d-flex align-items-center justify-content-center" onClick={() => togglePreview('devices')}>
                       <i className={`fas ${showPreview.devices ? 'fa-eye-slash' : 'fa-list-ul'} me-md-2`}></i>
                       <span className="d-none d-md-inline">{showPreview.devices ? 'Đóng ds' : 'Xem danh sách'}</span>
                     </button>
                     
                     <ColumnDropdown 
                       isOpen={colDropdownTab === 'devices'}
                       onToggle={() => setColDropdownTab(prev => prev === 'devices' ? null : 'devices')}
                       cols={colsDevice}
                       setCols={(newCols: ColMeta[]) => {
                         setColsDevice(newCols);
                         saveCols('hg_cols_device', newCols);
                       }}
                       disabled={colsDevice.length === 0}
                     />

                     <button 
                       className="btn btn-sm btn-primary px-3 fw-bold flex-grow-1 d-flex align-items-center justify-content-center" 
                       onClick={() => handleExport('devices', deviceFilters, colsDevice)}
                       disabled={isExporting}
                     >
                       <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} me-md-1`}></i>
                       <span className="d-none d-md-inline"> Xuất</span>
                     </button>
                   </div>
                </div>
              </div>

              {/* Device Stats Grid */}
              <div className="row g-3 mb-4">
                {[
                  { label: 'Tổng số', value: deviceSummary?.data?.devices?.total, color: 'primary', icon: 'fa-box' },
                  { label: 'Đang dùng', value: deviceSummary?.data?.devices?.dangSuDung, color: 'success', icon: 'fa-check-circle' },
                  { label: 'Đang sửa chữa', value: deviceSummary?.data?.devices?.dangSuaChua, color: 'warning', icon: 'fa-wrench' },
                  { label: 'Có sự cố', value: deviceSummary?.data?.devices?.coHuHong, color: 'info', icon: 'fa-exclamation-triangle' },
                  { label: 'Lỗi/Ngưng h.động', value: deviceSummary?.data?.devices?.huHong, color: 'danger', icon: 'fa-times-circle' },
                  { label: 'Thanh lý', value: deviceSummary?.data?.devices?.daThanhLy, color: 'secondary', icon: 'fa-trash-alt' },
                ].map((stat, idx) => (
                  <div key={idx} className="col-6 col-md-4 col-lg-2">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0 !important' }}>
                      <div className="card-body py-1 px-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <p className="x-small text-muted mb-0 uppercase fw-bold" style={{ fontSize: '0.6rem', lineHeight: '1.2' }}>{stat.label}</p>
                            <h3 className={`fw-bold mb-0 text-${stat.color}`}>{stat.value ?? 0}</h3>
                          </div>
                          <div className={`bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '36px', height: '36px' }}>
                            <i className={`fas ${stat.icon} fa-fw`}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {showPreview.devices && <PreviewTable data={deviceList?.data} loading={devListLoading} color="primary" configCols={colsDevice} />}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div className="col-12 mb-2 d-flex flex-wrap justify-content-between align-items-center border-bottom pb-2 gap-2">
                <div className="form-check form-switch d-flex align-items-center gap-2">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    role="switch" 
                    id="dailyReportMode"
                    checked={reportFilters.dailyMode}
                    onChange={e => {
                      const isDaily = e.target.checked;
                      setReportFilters(prev => ({ 
                        ...prev, 
                        dailyMode: isDaily,
                        fromDate: isDaily ? getLocalDateStr() : getFirstDayOfMonthStr(),
                        toDate: getLocalDateStr()
                      }));
                      if (isDaily) setShowPreview(prev => ({ ...prev, reports: true }));
                    }}
                  />
                  <label className="form-check-label fw-bold d-flex align-items-center" htmlFor="dailyReportMode" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    <span className={!reportFilters.dailyMode ? 'text-primary' : 'text-muted opacity-50'}>Bc tổng hợp</span>
                    <span className="mx-1 text-muted">/</span>
                    <span className={reportFilters.dailyMode ? 'text-success' : 'text-muted opacity-50'}>Bc ngày</span>
                  </label>
                </div>

                <div className="d-flex gap-2 align-items-center flex-grow-1 flex-md-grow-0 justify-content-end">
                   <button className={`btn btn-sm px-3 fw-bold ${reportFilters.dailyMode ? 'btn-success' : 'btn-outline-success'}`} onClick={() => togglePreview('reports')} style={{ minWidth: '40px' }}>
                     <i className={`fas ${showPreview.reports ? 'fa-eye-slash' : 'fa-list-ul'} ${showPreview.reports ? '' : 'me-md-1'}`}></i>
                     <span className="d-none d-md-inline">{showPreview.reports ? ' Đóng ds' : ' Danh sách'}</span>
                   </button>
                   
                   <ColumnDropdown 
                     isOpen={colDropdownTab === 'reports'}
                     onToggle={() => setColDropdownTab(prev => prev === 'reports' ? null : 'reports')}
                     cols={colsReport}
                     setCols={(newCols: ColMeta[]) => {
                       setColsReport(newCols);
                       saveCols('hg_cols_report', newCols);
                     }}
                     disabled={colsReport.length === 0}
                   />

                   <button 
                     className="btn btn-sm btn-success px-3 fw-bold" 
                     onClick={() => handleExport('reports', reportFilters, colsReport)}
                     disabled={isExporting}
                     style={{ minWidth: '40px' }}
                   >
                     <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} me-md-1`}></i>
                     <span className="d-none d-md-inline"> Xuất</span>
                   </button>
                </div>
              </div>

              <div className="row g-2 align-items-end mb-4 bg-light p-3 rounded-3 border">
                <div className="col-12 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Phòng ban</label>
                  <select 
                    className="form-select form-select-sm border shadow-none"
                    value={reportFilters.deptId}
                    onChange={e => setReportFilters(prev => ({ ...prev, deptId: Number(e.target.value), staffId: 0 }))}
                  >
                    <option value="0">Tất cả phòng ban</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {reportFilters.dailyMode ? (
                  <div className="col-12 col-md-2">
                    <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Nhân viên</label>
                    <select 
                      className="form-select form-select-sm border shadow-none"
                      value={reportFilters.staffId}
                      onChange={e => setReportFilters(prev => ({ ...prev, staffId: Number(e.target.value) }))}
                    >
                      <option value="0">Tất cả nhân viên</option>
                      {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="col-12 col-md-2">
                    <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Mức độ</label>
                    <select 
                      className="form-select form-select-sm border shadow-none"
                      value={reportFilters.priority}
                      onChange={e => setReportFilters(prev => ({ ...prev, priority: Number(e.target.value) }))}
                    >
                      <option value="0">Tất cả mức độ</option>
                      <option value="1">Thấp</option>
                      <option value="2">Bình thường</option>
                      <option value="3">Cao</option>
                      <option value="4">Khẩn cấp</option>
                    </select>
                  </div>
                )}

                <div className="col-12 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">{reportFilters.dailyMode ? 'Danh mục việc' : 'Trạng thái'}</label>
                  {reportFilters.dailyMode ? (
                    <select 
                      className="form-select form-select-sm border shadow-none border-success"
                      value={reportFilters.dailyCategory}
                      onChange={e => setReportFilters(prev => ({ ...prev, dailyCategory: e.target.value }))}
                    >
                      <option value="all">Tất cả công việc</option>
                      <option value="new">Việc mới (Chưa làm)</option>
                      <option value="active">Đang xử lý</option>
                      <option value="completed">Việc hoàn thành</option>
                      <option value="backlog">Việc tồn đọng</option>
                      <option value="priority">Việc ưu tiên</option>
                    </select>
                  ) : (
                    <select 
                      className="form-select form-select-sm border shadow-none"
                      value={reportFilters.status}
                      onChange={e => setReportFilters(prev => ({ ...prev, status: Number(e.target.value) }))}
                    >
                      <option value="0">Tất cả trạng thái</option>
                      <option value="1">Chờ xử lý</option>
                      <option value="2">Đã phân công</option>
                      <option value="3">Đang xử lý</option>
                      <option value="4">Hoàn thành</option>
                      <option value="5">Đã hủy</option>
                      <option value="6">Từ chối</option>
                    </select>
                  )}
                </div>

                <div className="col-12 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">{reportFilters.dailyMode ? 'Ngày xem' : 'Từ ngày'}</label>
                  <div className="position-relative">
                    <input 
                      type="text" 
                      className={`form-control form-control-sm border shadow-none bg-white pe-4 ${reportFilters.dailyMode ? 'border-success' : ''}`}
                      value={formatVietnameseDate(reportFilters.fromDate)}
                      readOnly
                    />
                    <i className="fas fa-calendar-alt position-absolute top-50 end-0 translate-middle-y me-2 text-muted small" style={{ pointerEvents: 'none' }}></i>
                    <input 
                      type="date" 
                      className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                      style={{ cursor: 'pointer' }}
                      value={reportFilters.fromDate} 
                      onChange={e => setReportFilters(prev => ({ 
                        ...prev, 
                        fromDate: e.target.value,
                        toDate: prev.dailyMode ? e.target.value : prev.toDate
                      }))} 
                    />
                  </div>
                </div>
                
                {!reportFilters.dailyMode && (
                  <div className="col-12 col-md-2">
                    <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Đến ngày</label>
                    <div className="position-relative">
                      <input 
                        type="text" 
                        className="form-control form-control-sm border shadow-none bg-white pe-4"
                        value={formatVietnameseDate(reportFilters.toDate)}
                        readOnly
                      />
                      <i className="fas fa-calendar-alt position-absolute top-50 end-0 translate-middle-y me-2 text-muted small" style={{ pointerEvents: 'none' }}></i>
                      <input 
                        type="date" 
                        className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                        style={{ cursor: 'pointer' }}
                        value={reportFilters.toDate} 
                        onChange={e => setReportFilters(prev => ({ ...prev, toDate: e.target.value }))} 
                      />
                    </div>
                  </div>
                )}

                <div className="col-12 col-md">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Tìm kiếm</label>
                   <input 
                    type="text" 
                    className="form-control form-control-sm border shadow-none" 
                    placeholder="Nội dung, thiết bị..."
                    value={reportFilters.search}
                    onChange={e => setReportFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>

              </div>

              {reportFilters.dailyMode ? (
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Việc mới', value: reportListResponse?.summary?.totalNew, color: 'success', icon: 'fa-plus-circle' },
                    { label: 'Đang xử lý', value: reportListResponse?.summary?.totalActive, color: 'info', icon: 'fa-spinner' },
                    { label: 'Hoàn thành', value: reportListResponse?.summary?.totalCompleted, color: 'primary', icon: 'fa-check-double' },
                    { label: 'Việc tồn đọng', value: reportListResponse?.summary?.totalPending, color: 'danger', icon: 'fa-history' },
                  ].map((stat, idx) => (
                    <div key={idx} className="col-6 col-md-3">
                      <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0 !important' }}>
                        <div className="card-body py-1 px-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <p className="x-small text-muted mb-0 uppercase fw-bold" style={{ fontSize: '0.6rem', lineHeight: '1.2' }}>{stat.label}</p>
                              <h3 className={`fw-bold mb-0 text-${stat.color}`}>{stat.value ?? 0}</h3>
                            </div>
                            <div className={`bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '36px', height: '36px' }}>
                              <i className={`fas ${stat.icon} fa-fw`}></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Tổng sự cố', value: reportSummary?.data?.reports?.total, color: 'primary', icon: 'fa-file-alt' },
                    { label: 'Chờ xử lý', value: reportSummary?.data?.reports?.pending, color: 'warning', icon: 'fa-clock' },
                    { label: 'Đang xử lý', value: reportSummary?.data?.reports?.inProgress, color: 'info', icon: 'fa-tools' },
                    { label: 'Đã hoàn thành', value: reportSummary?.data?.reports?.completed, color: 'success', icon: 'fa-check-circle' },
                  ].map((stat, idx) => (
                    <div key={idx} className="col-6 col-md-3">
                      <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0 !important' }}>
                        <div className="card-body py-1 px-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <p className="x-small text-muted mb-0 uppercase fw-bold" style={{ fontSize: '0.6rem', lineHeight: '1.2' }}>{stat.label}</p>
                              <h3 className={`fw-bold mb-0 text-${stat.color}`}>{stat.value ?? 0}</h3>
                            </div>
                            <div className={`bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '36px', height: '36px' }}>
                              <i className={`fas ${stat.icon} fa-fw`}></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showPreview.reports && (
                <PreviewTable 
                  data={reportListPaginated} 
                  loading={repListLoading} 
                  color="success" 
                  configCols={colsReport}
                  pagination={{
                    page: reportPage,
                    pageSize: pageSize,
                    total: reportList.total,
                    setPage: setReportPage,
                    setPageSize: setPageSize
                  }}
                  maintenanceBatches={maintenanceBatches}
                />
              )}
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .x-small { font-size: 0.75rem; }
        .uppercase { text-transform: uppercase; letter-spacing: 0.025em; }
        .nav-link.active { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .min-width-200 { min-width: 200px; }
      `}</style>
    </div>
  );
}


function PreviewTable({ data, loading, color, configCols, pagination, maintenanceBatches }: { 
  data: any[], 
  loading: boolean, 
  color: string, 
  configCols: {id: string, visible: boolean}[],
  pagination?: {
    page: number,
    pageSize: number,
    total: number,
    setPage: (p: number) => void,
    setPageSize: (s: number) => void
  },
  maintenanceBatches?: any[]
}) {
  if (loading) return <Loading />;
  if (!data || data.length === 0) return <div className="alert alert-light text-center border p-4 my-3 text-muted" style={{ borderRadius: '12px' }}><i className="fas fa-search me-2"></i>Không tìm thấy dữ liệu phù hợp với bộ lọc</div>;

  const visibleColIds = configCols && configCols.length > 0 
    ? configCols.filter(c => c.visible).map(c => c.id)
    : defaultReportColumnOrder.filter(id => id === 'deviceAndLocation' || Object.keys(data[0]).includes(id));

  if (visibleColIds.length === 0) {
    return <div className="alert alert-warning text-center border p-3 small">Vui lòng chọn ít nhất 1 cột để hiển thị</div>
  }

  const formatValue = (key: string, val: any, row?: any) => {
    const lowerKey = key.toLowerCase();

    // Special Handling for Virtual Column: Thiết bị (Ưu tiên tên thiết bị, fallback về vị trí)
    if (lowerKey === 'deviceandlocation' && row) {
      const dev = row.deviceName || row.DeviceName;
      if (dev && dev !== '-') return dev;
      
      const loc = row.damageLocation || row.DamageLocation;
      if (loc && loc !== '-') return loc;
      
      return row.deviceLocationName || '-';
    }

    if (val === null || val === undefined || val === '') return '-';
    
    // Format JSON Timeline (handlerNotes)
    if (lowerKey === 'handlernotes' && typeof val === 'string' && val.startsWith('[')) {
      try {
        const timeline = JSON.parse(val);
        if (Array.isArray(timeline) && timeline.length > 0) {
          return timeline[timeline.length - 1].content || '-';
        }
      } catch (e) { /* ignore parse error */ }
    }

    // Format Dates
    if (lowerKey.includes('date') || lowerKey === 'createdat' || lowerKey === 'updatedat') {
      return formatVietnameseDate(val);
    }

    return String(val);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div className="card border shadow-sm mt-3 animate__animated animate__fadeIn" style={{ borderRadius: '12px', overflow: 'hidden' }}>
      <div className="table-responsive" style={{ maxHeight: '600px' }}>
        <table className="table table-sm table-hover mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
          <thead className="bg-white sticky-top" style={{ zIndex: 10 }}>
            <tr className="border-bottom">
              {visibleColIds.map(h => (
                <th key={h} className="px-3 py-3 text-nowrap fw-bold text-muted uppercase bg-light" style={{ fontSize: '0.7rem', borderBottom: '1px solid #e2e8f0', width: h === 'stt' ? '50px' : 'auto' }}>
                  {columnLabels[h] || columnLabels[h.toLowerCase()] || h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-bottom" style={{ borderColor: '#f1f5f9' }}>
                {visibleColIds.map(h => (
                  <td key={h} className="px-3 py-2 text-nowrap text-truncate" style={{ maxWidth: '350px', color: '#1e293b' }}>
                    {h === 'stt' ? (
                      <span className="text-muted small fw-bold">
                        {pagination ? (pagination.page - 1) * pagination.pageSize + idx + 1 : idx + 1}
                      </span>
                    ) : h === 'deviceAndLocation' ? (
                      (() => {
                        const devName = row.deviceName;
                        const locName = row.damageLocation;
                        const isMaintenance = row.maintenanceBatchId || (row.damageContent && (row.damageContent.toLowerCase().includes('bảo trì') || row.damageContent.toUpperCase().startsWith('BT ')));
                        
                        if (!devName || devName === '-') {
                           if (isMaintenance) return <span className="badge bg-info bg-opacity-10 text-info fw-bold">Bảo trì</span>;
                           return locName || '-';
                        }
                        return devName;
                      })()
                    ) : h === 'damageContent' ? (
                      (() => {
                        const val = row[h];
                        if (row.maintenanceBatchId && maintenanceBatches) {
                           const batch = maintenanceBatches.find((b: any) => b.id === row.maintenanceBatchId);
                           if (batch) return `${batch.name} - ${batch.batchName || batch.id}`;
                           // Fallback: extract from string if possible
                           const match = String(val).match(/Bảo trì định kỳ: (.*?) \[Batch: (.*?)\]/);
                           if (match) return `${match[1]} - ${match[2]}`;
                        }
                        return val || '-';
                      })()
                    ) : h === 'dailyCategory' ? (
                      <span className={`badge ${
                        row[h] === 'Chưa làm' ? 'bg-secondary' : 
                        row[h] === 'Đang xử lý' ? 'bg-info' : 
                        row[h] === 'Hoàn thành' ? 'bg-success' : 'bg-warning'
                      } bg-opacity-10 text-${
                        row[h] === 'Chưa làm' ? 'secondary' : 
                        row[h] === 'Đang xử lý' ? 'info' : 
                        row[h] === 'Hoàn thành' ? 'success' : 'warning'
                      } border border-${
                        row[h] === 'Chưa làm' ? 'secondary' : 
                        row[h] === 'Đang xử lý' ? 'info' : 
                        row[h] === 'Hoàn thành' ? 'success' : 'warning'
                      } border-opacity-25`} style={{ fontSize: '0.7rem' }}>
                        {String(row[h])}
                      </span>
                    ) : h === 'priorityName' ? (
                      <span className={`fw-bold ${row[h] === 'Khẩn cấp' || row[h] === 'Cao' ? 'text-danger' : 'text-muted'}`}>
                        {String(row[h])}
                      </span>
                    ) : (
                      formatValue(h, row[h], row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="card-footer bg-white text-muted x-small d-flex flex-column flex-md-row justify-content-between align-items-center py-2 px-3 border-top gap-2">
        <div className="d-flex align-items-center gap-3">
          <span>Tổng cộng: <span className="fw-bold text-dark">{pagination?.total || data.length}</span> kết quả.</span>
          {pagination && (
            <div className="d-flex align-items-center gap-2">
              <span>Hiển thị:</span>
              <select 
                className="form-select form-select-sm" 
                style={{ fontSize: '0.75rem', width: 'auto', minWidth: '110px', height: '28px', padding: '0 8px' }}
                value={pagination.pageSize}
                onChange={e => pagination.setPageSize(Number(e.target.value))}
              >
                <option value="20">20 dòng</option>
                <option value="50">50 dòng</option>
                <option value="100">100 dòng</option>
              </select>
            </div>
          )}
        </div>

        {pagination && totalPages > 1 && (
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => pagination.setPage(pagination.page - 1)}><i className="fas fa-chevron-left"></i></button>
              </li>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let p = i + 1;
                // Simple sliding window
                if (totalPages > 5 && pagination.page > 3) {
                  p = pagination.page - 3 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                if (p <= 0) return null;
                if (p > totalPages) return null;

                return (
                  <li key={p} className={`page-item ${pagination.page === p ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => pagination.setPage(p)}>{p}</button>
                  </li>
                );
              })}
              <li className={`page-item ${pagination.page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => pagination.setPage(pagination.page + 1)}><i className="fas fa-chevron-right"></i></button>
              </li>
            </ul>
          </nav>
        )}
        
        <span className="fw-bold d-none d-md-block">Mẹo: Thay đổi thứ tự cột bằng nút cấu hình "Cột".</span>
      </div>
    </div>
  );
}

function ColumnDropdown({ isOpen, onToggle, cols, setCols, disabled }: { isOpen: boolean, onToggle: () => void, cols: {id: string, visible: boolean}[], setCols: any, disabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const toggleVisible = (idx: number) => {
    const newCols = [...cols];
    newCols[idx].visible = !newCols[idx].visible;
    setCols(newCols);
  };

  const moveCol = (idx: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === cols.length - 1)) return;
    const newCols = [...cols];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [newCols[idx], newCols[target]] = [newCols[target], newCols[idx]];
    setCols(newCols);
  };

  return (
    <div className="position-relative" ref={ref}>
      <button 
        className={`btn btn-sm fw-bold px-3 d-flex align-items-center h-100 ${isOpen ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
        onClick={onToggle}
        disabled={disabled}
        style={{ minWidth: '40px' }}
      >
        <i className="fas fa-columns me-md-1"></i>
        <span className="d-none d-md-inline"> Cột</span>
      </button>
      
      {isOpen && !disabled && (
        <div className="position-absolute bg-white shadow-lg border p-0 text-start animate__animated animate__fadeInUp" style={{ zIndex: 1050, top: '110%', right: '0', width: '320px', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div className="bg-light px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
            <span className="fw-bold text-dark small">Tuỳ chỉnh cột</span>
            <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.65rem' }}>{cols.filter(c => c.visible).length}/{cols.length}</span>
          </div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="px-2 py-1 custom-scrollbar">
            {cols.map((col, idx) => (
              <div key={col.id} className="d-flex align-items-center justify-content-between px-2 py-2 rounded-2 mb-1 hover-bg-light transition-all" style={{ transition: 'background 0.2s' }}>
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check form-switch mb-0 p-0 ps-4">
                    <input className="form-check-input ms-0 mt-0" type="checkbox" role="switch" checked={col.visible} onChange={() => toggleVisible(idx)} style={{ cursor: 'pointer', transform: 'scale(0.9)' }} />
                  </div>
                  <label className="mb-0 small fw-medium text-dark text-truncate cursor-pointer" style={{ maxWidth: '160px' }} onClick={() => toggleVisible(idx)}>
                    {columnLabels[col.id] || col.id}
                  </label>
                </div>
                <div className="btn-group shadow-sm" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                  <button className="btn btn-xs btn-white border px-2 py-1" onClick={() => moveCol(idx, 'up')} disabled={idx === 0} title="Lên"><i className="fas fa-chevron-up text-muted" style={{ fontSize: '0.7rem' }}></i></button>
                  <button className="btn btn-xs btn-white border px-2 py-1" onClick={() => moveCol(idx, 'down')} disabled={idx === cols.length - 1} title="Xuống"><i className="fas fa-chevron-down text-muted" style={{ fontSize: '0.7rem' }}></i></button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-light p-2 text-center border-top">
            <button className="btn btn-xs btn-link text-decoration-none p-0 text-muted" style={{ fontSize: '0.7rem' }} onClick={onToggle}>Đóng tuỳ chỉnh</button>
          </div>
        </div>
      )}
      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8fafc;
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .btn-xs {
          padding: 1px 5px;
          font-size: 0.75rem;
          line-height: 1.5;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
