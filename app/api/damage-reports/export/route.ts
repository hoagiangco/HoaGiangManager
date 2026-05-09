import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { StaffService } from '@/lib/services/staffService';
import { DepartmentService } from '@/lib/services/departmentService';
import { DeviceService } from '@/lib/services/deviceService';
import { DamageReportStatus, DamageReportPriority } from '@/types';
import { formatDateDisplay, formatDateTime, formatDateRange, formatDateFilename } from '@/lib/utils/dateFormat';
import { generateExcelFile, generateDailyReportExcel } from '@/lib/utils/excelGenerator.server';
import { formatTimelineForExcel } from '@/lib/utils/formatTimeline';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdminUser = user.roles && user.roles.includes('Admin');
    if (!isAdminUser) {
      return NextResponse.json(
        { status: false, error: 'Chỉ admin mới có quyền xuất Excel' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const deviceId = searchParams.get('deviceId');
    const locationId = searchParams.get('locationId');
    const keyword = searchParams.get('keyword');
    const maintenanceBatchId = searchParams.get('maintenanceBatchId');
    const handlerId = searchParams.get('handlerId');
    const isPreview = searchParams.get('preview') === 'true';

    // Get all reports with filters
    const damageReportService = new DamageReportService();
    const departmentService = new DepartmentService();
    
    const selectedDeptId = departmentId ? parseInt(departmentId) : 0;
    const selectedHandlerId = handlerId ? parseInt(handlerId) : 0;
    let selectedDeptName = 'Tất cả';
    
    if (selectedDeptId > 0) {
      const dept = await departmentService.getById(selectedDeptId);
      if (dept) {
        selectedDeptName = dept.name;
      }
    }

    const filters: any = {
      currentUserId: user.userId,
      isAdmin: true
    };
    
    if (selectedDeptId > 0) {
      filters.departmentId = selectedDeptId;
    }
    if (selectedHandlerId > 0) {
      filters.handlerId = selectedHandlerId;
    }
    if (status && parseInt(status) > 0) {
      filters.status = parseInt(status);
    }
    if (priority && parseInt(priority) > 0) {
      filters.priority = parseInt(priority);
    }
    if (deviceId && parseInt(deviceId) > 0) {
      filters.deviceId = parseInt(deviceId);
    }
    if (locationId && parseInt(locationId) > 0) {
      filters.locationId = parseInt(locationId);
    }
    if (keyword) {
      filters.search = keyword;
    }
    if (maintenanceBatchId) {
      filters.maintenanceBatchId = maintenanceBatchId;
    }

    const dailyMode = searchParams.get('dailyMode') === 'true';
    const category = searchParams.get('category') || 'all';

    // Helper: parse "YYYY-MM-DD" as local date (not UTC) to avoid timezone shift
    const parseDateLocal = (dateStr: string): Date => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    // Helper: get "YYYY-MM-DD" string from a date in local time
    const toDateOnlyStr = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    let from: Date | null = null;
    let to: Date | null = null;
    let fromDateStr: string | null = null;
    let toDateStr: string | null = null;

    if (fromDate) {
      // Parse as local date to avoid UTC midnight causing date shift
      from = parseDateLocal(fromDate);
      from.setHours(0, 0, 0, 0);
      fromDateStr = fromDate; // Keep original string for DB queries
      
      if (toDate) {
        to = parseDateLocal(toDate);
        to.setHours(23, 59, 59, 999);
        toDateStr = toDate;
      } else {
        to = parseDateLocal(fromDate);
        to.setHours(23, 59, 59, 999);
        toDateStr = fromDate;
      }
    }

    let allReports: any[] = [];

    let dailySummary: any = null;

    if (dailyMode && fromDateStr) {
      // Use daily report service logic - pass date string directly to avoid timezone issues
      const data = await damageReportService.getDailyReportData(fromDateStr, { departmentId: selectedDeptId, handlerId: selectedHandlerId });
      dailySummary = data.summary;
      
      // Categorize like the UI does
      const taggedNew = data.newReports.map((r: any) => ({ ...r, dailyCategory: 'Chưa làm', section: '1. VIỆC TRONG NGÀY' }));
      const taggedActive = data.activeReports.map((r: any) => ({ ...r, dailyCategory: 'Đang xử lý', section: '1. VIỆC TRONG NGÀY' }));
      const taggedCompleted = data.completedReports.map((r: any) => ({ ...r, dailyCategory: 'Hoàn thành', section: '1. VIỆC TRONG NGÀY' }));
      const taggedPendingActive = data.pendingActiveReports.map((r: any) => ({ ...r, dailyCategory: 'Đang xử lý', section: '2. VIỆC ĐANG XỬ LÝ' }));
      const taggedPending = data.pendingReports.map((r: any) => ({ ...r, dailyCategory: 'Tồn đọng', section: '3. VIỆC CHỜ XỬ LÝ' }));

      allReports = [...taggedNew, ...taggedActive, ...taggedCompleted, ...taggedPendingActive, ...taggedPending];

      // Filter by category
      if (category !== 'all') {
        if (category === 'new') allReports = allReports.filter((r: any) => r.dailyCategory === 'Chưa làm');
        else if (category === 'active') allReports = allReports.filter((r: any) => r.dailyCategory === 'Đang xử lý' && r.section === '1. VIỆC TRONG NGÀY');
        else if (category === 'completed') allReports = allReports.filter((r: any) => r.dailyCategory === 'Hoàn thành');
        else if (category === 'backlog') allReports = allReports.filter((r: any) => r.section === '2. VIỆC ĐANG XỬ LÝ' || r.section === '3. VIỆC CHỜ XỬ LÝ');
        else if (category === 'priority') allReports = allReports.filter((r: any) => r.priority >= DamageReportPriority.High);
      }
    } else {
      // Standard filtering
      allReports = await damageReportService.getAll(filters);

      // Filter by date range if provided - compare by date-only string to avoid timezone issues
      if (fromDateStr && toDateStr) {
        if (fromDateStr > toDateStr) {
          return NextResponse.json(
            { status: false, error: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc' },
            { status: 400 }
          );
        }

        allReports = allReports.filter(report => {
          if (!report.reportDate) return false;
          // Convert reportDate to local date-only string (YYYY-MM-DD)
          const rd = new Date(report.reportDate);
          const reportDateStr = toDateOnlyStr(rd);
          return reportDateStr >= fromDateStr! && reportDateStr <= toDateStr!;
        });
      }
    }

    const filteredReports = allReports;

    if (filteredReports.length === 0) {
      const deptName = selectedDeptId > 0 ? `bộ phận "${selectedDeptName}"` : 'tất cả bộ phận';
      const dateRange = formatDateRange(from, to);
      return NextResponse.json(
        { 
          status: false, 
          error: `Không có dữ liệu để xuất cho ${deptName} trong khoảng thời gian từ ${dateRange}. Vui lòng chọn khoảng thời gian khác hoặc bộ phận khác.` 
        },
        { status: 400 }
      );
    }

    // Get staff, departments, and devices for mapping
    const staffService = new StaffService();
    const deviceService = new DeviceService();

    const [allStaff, allDepartments, allDevices] = await Promise.all([
      staffService.getStaffByDepartment(0), // Get all staff (departmentId = 0 means all)
      departmentService.getAll(),
      deviceService.getDeviceByCategory(0) // Get all devices (categoryId = 0 means all)
    ]);

    const staffMap = new Map(allStaff.map(s => [s.id, s.name]));
    const deptMap = new Map(allDepartments.map(d => [d.id, d.name]));
    const deviceMap = new Map(allDevices.map(d => [d.id, d.name]));

    // Use already fetched department name or get from map as fallback
    const finalDeptName = selectedDeptId > 0 && selectedDeptName === 'Tất cả'
      ? (deptMap.get(selectedDeptId) || 'N/A')
      : selectedDeptName;

    // Prepare data for Excel
    const statusMap: Partial<Record<DamageReportStatus, string>> = {
      [DamageReportStatus.Pending]: 'Chờ xử lý',
      [DamageReportStatus.Assigned]: 'Đã phân công',
      [DamageReportStatus.InProgress]: 'Đang xử lý',
      [DamageReportStatus.Completed]: 'Hoàn thành',
      [DamageReportStatus.Cancelled]: 'Đã hủy',
      [DamageReportStatus.Rejected]: 'Từ chối',
    };

    const priorityMap: Record<DamageReportPriority, string> = {
      [DamageReportPriority.Low]: 'Thấp',
      [DamageReportPriority.Normal]: 'Bình thường',
      [DamageReportPriority.High]: 'Cao',
      [DamageReportPriority.Urgent]: 'Khẩn cấp',
    };

    const stripHtml = (html: string) => {
      if (!html) return '';
      return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    };

    // Get requested columns from query param
    const columnIdsParam = searchParams.get('columns');
    const requestedColumns = columnIdsParam ? columnIdsParam.split(',') : null;

    // Define all possible columns for mapping
    const allPossibleColumns = [
      { id: 'stt', label: 'STT' },
      { id: 'id', label: 'Mã số', dailyLabel: 'Mã số' },
      { id: 'reportDate', label: 'Ngày báo cáo' },
      { id: 'reporterName', label: 'Người báo cáo' },
      { id: 'reporterDepartmentName', label: 'Phòng ban' },
      { id: 'handlerName', label: 'Người xử lý' },
      { id: 'handlingDate', label: 'Ngày xử lý' },
      { id: 'completedDate', label: 'Ngày hoàn thành' },
      { id: 'deviceAndLocation', label: 'Thiết bị/Vị trí' },
      { id: 'damageContent', label: 'Nội dung báo cáo', dailyLabel: 'Nội dung sự cố' },
      { id: 'statusName', label: 'Trạng thái' },
      { id: 'priorityName', label: 'Mức độ' },
      { id: 'handlerNotes', label: 'Tiến độ xử lý' }
    ];

    // Filter and sort columns based on requestedColumns
    let finalColumns = allPossibleColumns;
    if (requestedColumns) {
      finalColumns = requestedColumns
        .map(id => allPossibleColumns.find(c => c.id.toLowerCase() === id.toLowerCase()))
        .filter(Boolean) as any[];
    } else if (dailyMode) {
      // Default daily columns if not specified
      const dailyIds = ['stt', 'reportDate', 'id', 'deviceAndLocation', 'reporterName', 'damageContent', 'handlerName', 'statusName', 'handlerNotes'];
      finalColumns = dailyIds.map(id => allPossibleColumns.find(c => c.id === id)).filter(Boolean) as any[];
    }

    // Helper to get data for a column
    const getColValue = (report: any, colId: string, idx: number) => {
      const reporterName = report.reporterName || staffMap.get(report.reporterId) || 'N/A';
      const handlerName = report.handlerName || (report.handlerId ? (staffMap.get(report.handlerId) || 'N/A') : 'Chưa phân công');
      const isMaintenance = report.maintenanceBatchId || (report.damageContent && (report.damageContent.toLowerCase().includes('bảo trì') || report.damageContent.toUpperCase().startsWith('BT ')));
      let deviceName = report.deviceName || (report.deviceId ? (deviceMap.get(report.deviceId) || 'N/A') : report.damageLocation || 'Khác');
      if (isMaintenance && (!report.deviceName || report.deviceName === '-')) {
        deviceName = 'Bảo trì';
      }

      switch (colId.toLowerCase()) {
        case 'stt': return idx + 1;
        case 'id': return report.id;
        case 'reportdate': return formatDateDisplay(report.reportDate) || '';
        case 'reportername': return reporterName;
        case 'reporterdepartmentname': return report.reporterDepartmentName || deptMap.get(report.reportingDepartmentId) || 'N/A';
        case 'handlername': return handlerName;
        case 'handlingdate': return formatDateDisplay(report.handlingDate) || '';
        case 'completeddate': return formatDateDisplay(report.completedDate) || '';
        case 'deviceandlocation': return deviceName;
        case 'damagecontent': return stripHtml(report.damageContent || '');
        case 'statusname': return report.statusName || statusMap[report.status as DamageReportStatus] || '';
        case 'priorityname': return report.priorityName || priorityMap[report.priority as DamageReportPriority] || '';
        case 'handlernotes': return formatTimelineForExcel(report.handlerNotes || '');
        default: return '';
      }
    };

    // If preview mode, return JSON data with raw keys instead of Excel file
    if (isPreview) {
      return NextResponse.json({
        status: true,
        data: allReports, // already have the raw keys and mapped names
        summary: dailySummary, // Include daily summary stats if available
        recordCount: allReports.length
      });
    }

    // Generate filename
    const deptNameForFile = selectedDeptId > 0 
      ? finalDeptName.replace(/[^a-zA-Z0-9]/g, '_')
      : 'TatCa';
    const fileName = `BaoCao_${deptNameForFile}_${formatDateFilename(from)}_${formatDateFilename(to)}.xlsx`;

    // Generate Excel file
    let excelBuffer: Buffer;
    
    if (dailyMode) {
      const headers = finalColumns.map(c => c.dailyLabel || c.label);
      const mapToRow = (reports: any[]) => reports.map((r, idx) => {
        return finalColumns.map(col => getColValue(r, col.id, idx));
      });

      // Split into sections (using the categorization logic from earlier)
      const dataForSections = await damageReportService.getDailyReportData(fromDateStr!, { departmentId: selectedDeptId, handlerId: selectedHandlerId });
      
      excelBuffer = await generateDailyReportExcel({
        title: 'BÁO CÁO CÔNG VIỆC TRONG NGÀY',
        date: formatDateDisplay(from) || fromDateStr!,
        summary: {
          totalNew: dataForSections.summary.totalNew,
          totalActive: dataForSections.summary.totalActive,
          totalCompleted: dataForSections.summary.totalCompleted,
          totalPending: dataForSections.summary.totalPending,
          totalPendingActive: dataForSections.summary.totalPendingActive,
        },
        sections: [
          { title: '1. VIỆC TRONG NGÀY', headers, rows: mapToRow([...dataForSections.newReports, ...dataForSections.activeReports, ...dataForSections.completedReports]) },
          { title: '2. VIỆC ĐANG XỬ LÝ', headers, rows: mapToRow(dataForSections.pendingActiveReports) },
          { title: '3. VIỆC CHỜ XỬ LÝ', headers, rows: mapToRow(dataForSections.pendingReports) },
        ],
      });
    } else {
      // Standard Excel generation
      const headers = finalColumns.map(c => c.label);
      const rows = allReports.map((report, idx) => {
        return finalColumns.map(col => getColValue(report, col.id, idx));
      });

      excelBuffer = await generateExcelFile({
        title: 'BÁO CÁO CÔNG VIỆC',
        department: finalDeptName,
        dateRange: `Từ ngày: ${formatDateDisplay(from)} đến ngày: ${formatDateDisplay(to)}`,
        headers,
        rows,
        fileName,
      });
    }

    // Return file as response
    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Export Excel error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi xuất Excel: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  }
}

