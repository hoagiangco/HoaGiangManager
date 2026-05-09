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
  'id': 'Mã TB',
  'deviceAndLocation': 'Thiết bị',
  'deviceName': 'Tên thiết bị',
  'deviceSerial': 'Số Serial',
  'deviceCategoryName': 'Loại thiết bị',
  'deviceDepartmentName': 'Phòng ban',
  'deviceLocationName': 'Vị trí',
  'statusName': 'Trạng thái',
  'useDate': 'Ngày sử dụng',
  'reporterName': 'Người báo cáo',
  'handlerName': 'Người xử lý',
  'reportDate': 'Ngày báo',
  'handlingDate': 'Ngày xử lý',
  'completedDate': 'Ngày xong',
  'damageContent': 'Nội dung sự cố',
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
  'devicelocationname': 'Vị trí',
  'devicename': 'Tên thiết bị',
  'usedate': 'Ngày sử dụng',
  'devicedepartmentname': 'Phòng ban',
  'devicecategoryname': 'Loại thiết bị',
  'deviceserial': 'Số Serial'
};

const columnBlacklist = [
  'deviceid', 'reporterid', 'handlerid', 'reportingdepartmentid', 
  'status', 'priority', 'images', 'afterimages', 'maintenancebatchid', 
  'createdby', 'updatedby', 'createdat', 'updatedat', 'rejectionreason',
  'devicestatus', 'dayssincereport', 'daysinprogress', 'isoverdue', 
  'reporterdepartmentname', 'handlerdepartmentname', 'updatedbyname',
  'notes', 'dailycategory', 'worknotes', 'checkinstaffname'
];

const defaultReportColumnOrder = [
  'stt', 'deviceAndLocation', 'reportDate', 'damageContent', 'statusName', 'priorityName', 'handlerName', 'completedDate', 'notes'
];

const defaultDeviceColumnOrder = [
  'stt', 'id', 'deviceName', 'deviceSerial', 'deviceCategoryName', 'deviceDepartmentName', 'deviceLocationName', 'statusName', 'useDate', 'notes'
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
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({ reports: true, devices: true });
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    const data = activeTab === 'reports' ? reportList.data : deviceList?.data;
    if (!data || data.length === 0) {
      toast.warning('Không có dữ liệu để in');
      return;
    }

    const cols = activeTab === 'reports' ? colsReport : colsDevice;
    const visibleCols = cols.filter(c => c.visible);
    if (visibleCols.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một cột để hiển thị');
      return;
    }

    setIsPrinting(true);

    const title = activeTab === 'reports' 
      ? (reportFilters.dailyMode ? 'BÁO CÁO CÔNG VIỆC TRONG NGÀY' : 'BÁO CÁO TỔNG HỢP CÔNG VIỆC')
      : 'DANH SÁCH THIẾT BỊ';
    
    const subtitle = activeTab === 'reports'
      ? (reportFilters.dailyMode 
          ? `Ngày: ${formatVietnameseDate(reportFilters.fromDate)}`
          : `Từ ngày: ${formatVietnameseDate(reportFilters.fromDate)} - Đến ngày: ${formatVietnameseDate(reportFilters.toDate)}`)
      : `Phòng ban: ${departments.find((d: any) => d.id === deviceFilters.deptId)?.name || 'Tất cả'}`;

    // printWindow.document.title = title;

    const stripHtml = (html: string) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    };

    const getVal = (row: any, colId: string, idx: number) => {
      const lowerId = colId.toLowerCase();
      if (lowerId === 'stt') return idx + 1;
      
      if (lowerId === 'deviceandlocation') {
        const devName = row.deviceName || row.DeviceName;
        const locName = row.damageLocation || row.DamageLocation;
        const isMaintenance = row.maintenanceBatchId || (row.damageContent && (row.damageContent.toLowerCase().includes('bảo trì') || row.damageContent.toUpperCase().startsWith('BT ')));
        if (!devName || devName === '-') {
           if (isMaintenance) return 'Bảo trì';
           return locName || '-';
        }
        return devName;
      }

      if (lowerId === 'damagecontent') {
        let val = row[colId] || row['damageContent'] || '-';
        if (row.maintenanceBatchId && maintenanceBatches) {
          const batch = maintenanceBatches.find((b: any) => b.id === row.maintenanceBatchId);
          if (batch) return `${batch.name} - ${batch.batchName || batch.id}`;
        }
        return stripHtml(String(val));
      }

      if (lowerId === 'handlernotes') {
        const val = row[colId] || '-';
        if (typeof val === 'string' && val.startsWith('[')) {
          try {
            const timeline = JSON.parse(val);
            if (Array.isArray(timeline) && timeline.length > 0) {
              return timeline[timeline.length - 1].content || '-';
            }
          } catch (e) { /* ignore */ }
        }
        return stripHtml(String(val));
      }

      if (lowerId.includes('date') || lowerId === 'createdat' || lowerId === 'updatedat') {
        return formatVietnameseDate(row[colId]);
      }

      return row[colId] || '-';
    };

    const renderTable = (tableData: any[], startIndex = 0) => {
      if (tableData.length === 0) return '';
      return `
        <table>
          <thead>
            <tr>
              ${visibleCols.map(c => `<th>${columnLabels[c.id] || columnLabels[c.id.toLowerCase()] || c.id}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableData.map((row, i) => `
              <tr>
                ${visibleCols.map(c => {
                  const val = getVal(row, c.id, startIndex + i);
                  const isCenter = ['stt', 'id', 'reportDate', 'statusName', 'priorityName', 'completedDate', 'handlingDate'].includes(c.id);
                  return `<td style="text-align: ${isCenter ? 'center' : 'left'}">${val}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    };

    let contentHtml = '';
    if (activeTab === 'reports' && reportFilters.dailyMode) {
      const summary = reportListResponse?.summary;
      contentHtml = `
        <div class="summary-box">
          <div class="summary-item">Việc mới: <span style="color: #22c55e">${summary?.totalNew || 0}</span></div>
          <div class="summary-item">Đang xử lý: <span style="color: #06b6d4">${summary?.totalActive || 0}</span></div>
          <div class="summary-item">Hoàn thành: <span style="color: #3b82f6">${summary?.totalCompleted || 0}</span></div>
          <div class="summary-item">Tồn đọng: <span style="color: #ef4444">${summary?.totalPending || 0}</span></div>
        </div>
        <div class="section-title">I. Việc chưa xử lý</div>
        ${renderTable(data.filter((r: any) => r.dailyCategory === 'Chưa làm'))}
        <div class="section-title">II. Việc đang làm chưa xong</div>
        ${renderTable(data.filter((r: any) => r.dailyCategory === 'Đang xử lý'))}
        <div class="section-title">III. Việc đã xong</div>
        ${renderTable(data.filter((r: any) => r.dailyCategory === 'Hoàn thành'))}
        <div class="section-title">IV. Việc tồn đọng</div>
        ${renderTable(data.filter((r: any) => r.dailyCategory === 'Tồn đọng'))}
      `;
    } else {
      contentHtml = renderTable(data);
    }

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: "Segoe UI", Roboto, Arial, sans-serif; font-size: 10pt; color: #334155; margin: 0; padding: 0; }
            .header { border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .company-name { font-weight: bold; font-size: 12pt; }
            .system-name { font-size: 9pt; color: #64748b; }
            .print-date { font-size: 9pt; }
            .title { text-align: center; font-size: 18pt; font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #1e293b; }
            .subtitle { text-align: center; font-size: 11pt; color: #475569; margin-bottom: 20px; font-style: italic; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #475569 !important; color: white !important; border: 1px solid #334155; padding: 8px; font-size: 9pt; text-transform: uppercase; -webkit-print-color-adjust: exact; }
            td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: middle; font-size: 9pt; word-wrap: break-word; }
            .section-title { font-size: 11pt; font-weight: bold; color: #2563eb; margin-top: 25px; margin-bottom: 8px; border-left: 4px solid #2563eb; padding-left: 10px; }
            .summary-box { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; padding: 12px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
            .summary-item { font-weight: bold; font-size: 10pt; }
            tr:nth-child(even) { background-color: #fcfcfc; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">CÔNG TY CỔ PHẦN DU LỊCH - THƯƠNG MẠI HOÀ GIANG</div>
              <div class="system-name">Hệ thống quản lý Thiết bị và Báo cáo công việc</div>
            </div>
            <div class="print-date">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
          <div class="title">${title}</div>
          <div class="subtitle">${subtitle}</div>
          ${contentHtml}
          <div style="margin-top: 40px; display: flex; justify-content: flex-end; gap: 100px; padding-right: 50px;">
            <div style="text-align: center;">
              <div style="font-weight: bold;">Người lập biểu</div>
              <div style="margin-top: 60px;">................................</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold;">Xác nhận bộ phận</div>
              <div style="margin-top: 60px;">................................</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 300);
            };
          </script>
        </body>
      </html>
    `;
 
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      toast.error('Không thể mở cửa sổ in. Vui lòng kiểm tra cài đặt trình duyệt.');
      setIsPrinting(false);
      return;
    }

    // Clean up object URL after a while
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setIsPrinting(false);
  };

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

      // Auto-migration: Add missing default columns to saved config
      if (filteredSaved) {
        let changed = false;
        defaultDeviceColumnOrder.forEach(defId => {
          if (!filteredSaved!.some(c => c.id.toLowerCase() === defId.toLowerCase())) {
            filteredSaved!.push({ id: defId, visible: true });
            changed = true;
          }
        });
        if (changed) saveCols('hg_cols_device', filteredSaved);
      }

      if (filteredSaved && filteredSaved.length > 0 && filteredSaved.some(c => c.visible)) {
        setColsDevice(filteredSaved);
        return;
      }

      const keys = Object.keys(deviceList.data[0]);
      const lowerKeys = keys.map(k => k.toLowerCase());
      
      // Ensure all default columns are present, even if key case is different
      const initialColsBase = defaultDeviceColumnOrder
        .map(id => {
          // Find original key that matches (case-insensitive)
          const originalKey = keys.find(k => k.toLowerCase() === id.toLowerCase());
          if (id === 'stt') return { id, visible: true };
          if (originalKey) return { id: originalKey, visible: true };
          // If not found in keys but in default, still include it (might be virtual or just missing in first row)
          return { id, visible: true };
        });

      const otherKeys = keys.filter(k => 
        !defaultDeviceColumnOrder.some(d => d.toLowerCase() === k.toLowerCase()) && 
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

        // Auto-migration: Add missing default columns
        let changed = false;
        defaultReportColumnOrder.forEach(defId => {
          if (!finalSaved!.some(c => c.id.toLowerCase() === defId.toLowerCase())) {
            finalSaved!.push({ id: defId, visible: true });
            changed = true;
          }
        });
        if (changed) saveCols('hg_cols_report', finalSaved);
      }

      if (finalSaved) {
        // Always filter out blacklisted items even from saved config
        const filteredSaved = finalSaved.filter(c => 
          !columnBlacklist.includes(c.id) && 
          !columnBlacklist.includes(c.id.toLowerCase())
        );
        if (filteredSaved.length > 0 && filteredSaved.some(c => c.visible)) {
          setColsReport(filteredSaved);
          return;
        }
      }

      const keys = Object.keys(reportList.data[0]);
      const lowerKeys = keys.map(k => k.toLowerCase());
      
      const initialColsBase = defaultReportColumnOrder
        .map(id => {
           if (id === 'stt' || id === 'deviceAndLocation') return { id, visible: true };
           const originalKey = keys.find(k => k.toLowerCase() === id.toLowerCase());
           if (originalKey) return { id: originalKey, visible: true };
           return { id, visible: true };
        });
        
      const otherKeys = keys.filter(k => 
        !defaultReportColumnOrder.some(d => d.toLowerCase() === k.toLowerCase()) && 
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
      
      // Pass visible columns to server
      const visibleColIds = cols.filter(c => c.visible).map(c => c.id);
      if (visibleColIds.length > 0) {
        params.append('columns', visibleColIds.join(','));
      }
      
      const endpoint = tab === 'reports' ? '/damage-reports/export' : '/statistics/export';
      
      // Use server-side Excel for Reports and Devices tabs to get professional formatting (sections, landscape, etc.)
      if (tab === 'reports' || tab === 'devices') {
        const response = await api.get(`${endpoint}?${params.toString()}`, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Generate a nice filename
        let fileName = tab === 'reports' ? 'Bao_Cao_Cong_Viec' : 'Danh_Sach_Thiet_Bi';
        if (tab === 'reports') {
          if (filters.dailyMode) {
            fileName = `Bao_Cao_Ngay_${filters.fromDate || getLocalDateStr()}`;
          } else {
            fileName = `Bao_Cao_Tong_Hop_${filters.fromDate || ''}_den_${filters.toDate || ''}`;
          }
        }
        
        link.setAttribute('download', `${fileName}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.update(toastId, { render: 'Xuất Excel thành công!', type: 'success', isLoading: false, autoClose: 3000 });
        return;
      }

      // Fallback logic
      toast.update(toastId, { render: 'Lỗi xuất file!', type: 'error', isLoading: false, autoClose: 3000 });
    } catch (error: any) {
      console.error(error);
      toast.update(toastId, { render: 'Lỗi khi xuất file Excel!', type: 'error', isLoading: false, autoClose: 3000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container-fluid px-2 py-1">
      {/* Page Header & Tabs - Combined for compactness */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 bg-white p-2 rounded-3 shadow-sm border">
        <div className="d-flex align-items-center gap-3">
          <div className="d-none d-lg-block border-end pe-3 d-print-none">
            <h6 className="fw-bold mb-0 text-dark">Thống kê & Báo cáo</h6>
          </div>
          
          <div className="nav nav-pills gap-1 p-1 bg-light rounded-2 border d-print-none">
            <button 
              className={`nav-link px-3 py-1 small fw-bold ${activeTab === 'reports' ? 'active bg-success' : 'text-muted'}`}
              onClick={() => setActiveTab('reports')}
            >
              <i className="fas fa-file-invoice me-1"></i>Báo cáo
            </button>
            <button 
              className={`nav-link px-3 py-1 small fw-bold ${activeTab === 'devices' ? 'active bg-primary' : 'text-muted'}`}
              onClick={() => setActiveTab('devices')}
            >
              <i className="fas fa-desktop me-1"></i>Thiết bị
            </button>
          </div>
        </div>

        <div className="d-flex gap-2 mt-2 mt-md-0">
          {activeTab === 'reports' && (
            <>
              <div className="form-check form-switch d-flex align-items-center gap-2 border-end pe-3 me-1 d-print-none">
                <input 
                  className="form-check-input mt-0" 
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
                <label className="form-check-label fw-bold d-flex align-items-center mb-0" htmlFor="dailyReportMode" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                  <span className={!reportFilters.dailyMode ? 'text-primary' : 'text-muted opacity-50'}>Bc tổng hợp</span>
                  <span className="mx-1 text-muted">/</span>
                  <span className={reportFilters.dailyMode ? 'text-success' : 'text-muted opacity-50'}>Bc ngày</span>
                </label>
              </div>

              <div className="d-flex gap-1 d-print-none">
                <button className={`btn btn-xs btn-outline-secondary px-2 ${showPreview.reports ? 'active' : ''}`} onClick={() => togglePreview('reports')} title="Hiện/Ẩn danh sách">
                  <i className={`fas ${showPreview.reports ? 'fa-eye-slash' : 'fa-list-ul'}`}></i>
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
                  className="btn btn-xs btn-outline-dark px-2" 
                  onClick={handlePrint}
                  title="In báo cáo"
                >
                  <i className="fas fa-print me-1"></i>In
                </button>

                <button 
                  className="btn btn-xs btn-success px-2" 
                  onClick={() => handleExport('reports', reportFilters, colsReport)}
                  disabled={isExporting}
                >
                  <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} me-1`}></i>Xuất
                </button>
              </div>
            </>
          )}

          {activeTab === 'devices' && (
             <div className="d-flex gap-1 d-print-none">
                <button className={`btn btn-xs btn-outline-secondary px-2 ${showPreview.devices ? 'active' : ''}`} onClick={() => togglePreview('devices')} title="Hiện/Ẩn danh sách">
                  <i className={`fas ${showPreview.devices ? 'fa-eye-slash' : 'fa-list-ul'}`}></i>
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
                   className="btn btn-xs btn-outline-dark px-2" 
                   onClick={handlePrint}
                   title="In danh sách"
                >
                   <i className="fas fa-print me-1"></i>In
                </button>

                <button 
                  className="btn btn-xs btn-primary px-2" 
                  onClick={() => handleExport('devices', deviceFilters, colsDevice)}
                  disabled={isExporting}
                >
                  <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} me-1`}></i>Xuất
                </button>
             </div>
          )}
        </div>
      </div>

      <div className="d-none d-print-block mb-4">
        <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
          <div>
            <h5 className="fw-bold mb-0 text-dark">CÔNG TY CỔ PHẦN DU LỊCH - THƯƠNG MẠI HOÀ GIANG</h5>
            <p className="small mb-0 text-muted">Hệ thống quản lý Thiết bị và Báo cáo công việc</p>
          </div>
          <div className="text-end">
            <p className="small mb-0">Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
        <h4 className="text-center fw-bold uppercase mt-3 mb-1">
          {activeTab === 'reports' ? 'BÁO CÁO CÔNG VIỆC' : 'DANH SÁCH THIẾT BỊ'}
        </h4>
        <p className="text-center small mb-4">
          {activeTab === 'reports' && (
            reportFilters.dailyMode 
              ? `Ngày: ${formatVietnameseDate(reportFilters.fromDate)}`
              : `Từ ngày: ${formatVietnameseDate(reportFilters.fromDate)} - Đến ngày: ${formatVietnameseDate(reportFilters.toDate)}`
          )}
        </p>
      </div>
      
      <div className="card shadow-sm border-0 mb-2 print-no-shadow" style={{ borderRadius: '8px' }}>
        <div className="card-body p-2 print-p-0">
          {/* Tab Content: Devices */}
          {activeTab === 'devices' && (
            <div>
              <div className="row g-2 align-items-end mb-2 bg-light p-2 rounded-3 mx-0 border d-print-none">
                <div className="col-6 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Phòng ban</label>
                  <select 
                    className="form-select form-select-xs border shadow-none"
                    value={deviceFilters.deptId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, deptId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Vị trí</label>
                   <select 
                    className="form-select form-select-xs border shadow-none"
                    value={deviceFilters.locId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, locId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Danh mục</label>
                   <select 
                    className="form-select form-select-xs border shadow-none"
                    value={deviceFilters.categoryId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Trạng thái</label>
                   <select 
                    className="form-select form-select-xs border shadow-none"
                    value={deviceFilters.status}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, status: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    <option value="1">Đang sử dụng</option>
                    <option value="2">Đang sửa chữa</option>
                    <option value="3">Lỗi/Ngưng hoạt động</option>
                    <option value="4">Đã thanh lý</option>
                    <option value="5">Sự cố</option>
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
              </div>

              {/* Compact Device Stats Bar */}
              <div className="d-flex flex-wrap gap-2 mb-2 p-2 bg-white rounded border d-print-none">
                {[
                  { label: 'Tổng', value: deviceSummary?.data?.devices?.total, color: 'primary' },
                  { label: 'Dùng', value: deviceSummary?.data?.devices?.dangSuDung, color: 'success' },
                  { label: 'Sửa', value: deviceSummary?.data?.devices?.dangSuaChua, color: 'warning' },
                  { label: 'Sự cố', value: deviceSummary?.data?.devices?.coHuHong, color: 'info' },
                  { label: 'Lỗi', value: deviceSummary?.data?.devices?.huHong, color: 'danger' },
                ].map((stat, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-1 border-end pe-2">
                    <span className="x-small text-muted uppercase fw-bold">{stat.label}:</span>
                    <span className={`fw-bold text-${stat.color}`}>{stat.value ?? 0}</span>
                  </div>
                ))}
              </div>

              {showPreview.devices && <PreviewTable data={deviceList?.data} loading={devListLoading} color="primary" configCols={colsDevice} />}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <div className="row g-2 align-items-end mb-2 bg-light p-2 rounded-3 mx-0 border d-print-none">
                <div className="col-6 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Phòng ban</label>
                  <select 
                    className="form-select form-select-xs border shadow-none"
                    value={reportFilters.deptId}
                    onChange={e => setReportFilters(prev => ({ ...prev, deptId: Number(e.target.value), staffId: 0 }))}
                  >
                    <option value="0">Tất cả phòng ban</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {reportFilters.dailyMode ? (
                  <div className="col-6 col-md-2">
                    <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Nhân viên</label>
                    <select 
                      className="form-select form-select-xs border shadow-none"
                      value={reportFilters.staffId}
                      onChange={e => setReportFilters(prev => ({ ...prev, staffId: Number(e.target.value) }))}
                    >
                      <option value="0">Tất cả nhân viên</option>
                      {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="col-6 col-md-2">
                    <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Mức độ</label>
                    <select 
                      className="form-select form-select-xs border shadow-none"
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

                <div className="col-6 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">{reportFilters.dailyMode ? 'Danh mục' : 'Trạng thái'}</label>
                  {reportFilters.dailyMode ? (
                    <select 
                      className="form-select form-select-xs border shadow-none border-success"
                      value={reportFilters.dailyCategory}
                      onChange={e => setReportFilters(prev => ({ ...prev, dailyCategory: e.target.value }))}
                    >
                      <option value="all">Tất cả</option>
                      <option value="new">Việc mới</option>
                      <option value="active">Đang xử lý</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="backlog">Tồn đọng</option>
                    </select>
                  ) : (
                    <select 
                      className="form-select form-select-xs border shadow-none"
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

                <div className="col-6 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">{reportFilters.dailyMode ? 'Ngày xem' : 'Từ ngày'}</label>
                  <div className="position-relative">
                    <input 
                      type="text" 
                      className={`form-control form-control-xs border shadow-none bg-white pe-4 ${reportFilters.dailyMode ? 'border-success' : ''}`}
                      value={formatVietnameseDate(reportFilters.fromDate)}
                      readOnly
                    />
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
                  <div className="col-6 col-md-2">
                    <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Đến ngày</label>
                    <div className="position-relative">
                      <input 
                        type="text" 
                        className="form-control form-control-xs border shadow-none bg-white pe-4"
                        value={formatVietnameseDate(reportFilters.toDate)}
                        readOnly
                      />
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

                <div className="col col-md">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Tìm kiếm</label>
                   <input 
                    type="text" 
                    className="form-control form-control-xs border shadow-none" 
                    placeholder="Nội dung..."
                    value={reportFilters.search}
                    onChange={e => setReportFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              {/* Compact Stats Bar for Reports */}
              <div className="d-flex flex-wrap gap-3 mb-2 p-2 bg-white rounded border d-print-none">
                {reportFilters.dailyMode ? (
                  [
                    { label: 'Việc mới', value: reportListResponse?.summary?.totalNew, color: 'success' },
                    { label: 'Đang xử lý', value: reportListResponse?.summary?.totalActive, color: 'info' },
                    { label: 'Hoàn thành', value: reportListResponse?.summary?.totalCompleted, color: 'primary' },
                    { label: 'Tồn đọng', value: reportListResponse?.summary?.totalPending, color: 'danger' },
                  ].map((stat, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-1 border-end pe-3">
                      <span className="x-small text-muted uppercase fw-bold">{stat.label}:</span>
                      <span className={`fw-bold text-${stat.color}`}>{stat.value ?? 0}</span>
                    </div>
                  ))
                ) : (
                  [
                    { label: 'Tổng sự cố', value: reportSummary?.data?.reports?.total, color: 'primary' },
                    { label: 'Chờ xử lý', value: reportSummary?.data?.reports?.pending, color: 'warning' },
                    { label: 'Đang xử lý', value: reportSummary?.data?.reports?.inProgress, color: 'info' },
                    { label: 'Hoàn thành', value: reportSummary?.data?.reports?.completed, color: 'success' },
                  ].map((stat, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-1 border-end pe-3">
                      <span className="x-small text-muted uppercase fw-bold">{stat.label}:</span>
                      <span className={`fw-bold text-${stat.color}`}>{stat.value ?? 0}</span>
                    </div>
                  ))
                )}
              </div>

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
        .x-small { font-size: 0.7rem; }
        .uppercase { text-transform: uppercase; letter-spacing: 0.025em; }
        .nav-link.active { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
        .form-select-xs, .form-control-xs { 
          padding: 0.25rem 0.5rem; 
          font-size: 0.8rem; 
          height: auto;
          min-height: 31px;
        }
        .btn-xs {
          padding: 0.2rem 0.5rem;
          font-size: 0.75rem;
          line-height: 1.5;
          border-radius: 4px;
        }
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            background-color: #fff !important;
            color: #000 !important;
          }
          .container-fluid {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .print-no-shadow {
            box-shadow: none !important;
            border: none !important;
          }
          .print-p-0 {
            padding: 0 !important;
          }
          .table-responsive {
            max-height: none !important;
            overflow: visible !important;
          }
          .table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .table th {
            background-color: #f8fafc !important;
            color: #000 !important;
            border: 1px solid #dee2e6 !important;
            -webkit-print-color-adjust: exact;
          }
          .table td {
            border: 1px solid #dee2e6 !important;
            white-space: normal !important;
            word-break: break-word !important;
            font-size: 8.5pt !important;
          }
          .badge {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: transparent !important;
          }
          /* Hide sidebar/header from layout.tsx if they exist */
          :global(.sidebar), :global(.navbar), :global(.top-bar) {
            display: none !important;
          }
        }
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
    : (color === 'primary' ? defaultDeviceColumnOrder : defaultReportColumnOrder);

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
      
      <div className="card-footer bg-white text-muted x-small d-flex flex-column flex-md-row justify-content-between align-items-center py-2 px-3 border-top gap-2 d-print-none">
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
                    {columnLabels[col.id] || columnLabels[col.id.toLowerCase()] || col.id}
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
