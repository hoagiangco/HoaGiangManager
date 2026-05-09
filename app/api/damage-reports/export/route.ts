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
      const taggedNew = data.newReports.map(r => ({ ...r, dailyCategory: 'Chưa làm' }));
      const taggedActive = data.activeReports.map(r => ({ ...r, dailyCategory: 'Đang xử lý' }));
      const taggedCompleted = data.completedReports.map(r => ({ ...r, dailyCategory: 'Hoàn thành' }));
      const taggedPending = data.pendingReports.map(r => ({ ...r, dailyCategory: 'Tồn đọng' }));

      allReports = [...taggedNew, ...taggedActive, ...taggedCompleted, ...taggedPending];

      // Remove duplicates
      const seenIds = new Set();
      allReports = allReports.filter(r => {
        if (seenIds.has(r.id)) return false;
        seenIds.add(r.id);
        return true;
      });

      // Filter by category
      if (category !== 'all') {
        if (category === 'new') allReports = allReports.filter(r => r.dailyCategory === 'Chưa làm');
        else if (category === 'active') allReports = allReports.filter(r => r.dailyCategory === 'Đang xử lý');
        else if (category === 'completed') allReports = allReports.filter(r => r.dailyCategory === 'Hoàn thành');
        else if (category === 'backlog') allReports = allReports.filter(r => r.dailyCategory === 'Tồn đọng');
        else if (category === 'priority') allReports = allReports.filter(r => r.priority >= DamageReportPriority.High);
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

    // If preview mode, return JSON data with raw keys instead of Excel file
    if (isPreview) {
      return NextResponse.json({
        status: true,
        data: allReports, // already have the raw keys and mapped names
        summary: dailySummary, // Include daily summary stats if available
        recordCount: allReports.length
      });
    }

    // Prepare data for Excel (Friendly labels)
    const excelData = allReports.map((report, index) => {
      const reporterName = report.reporterName || staffMap.get(report.reporterId) || 'N/A';
      const handlerName = report.handlerName || (report.handlerId ? (staffMap.get(report.handlerId) || 'N/A') : 'Chưa phân công');
      
      const isMaintenance = report.maintenanceBatchId || (report.damageContent && (report.damageContent.toLowerCase().includes('bảo trì') || report.damageContent.toUpperCase().startsWith('BT ')));
      let deviceName = report.deviceName || (report.deviceId ? (deviceMap.get(report.deviceId) || 'N/A') : report.damageLocation || 'Khác');
      if (isMaintenance && (!report.deviceName || report.deviceName === '-')) {
        deviceName = 'Bảo trì';
      }

      if (dailyMode) {
        return {
          'STT': index + 1,
          'Mã số': report.id,
          'Ngày báo cáo': formatDateDisplay(report.reportDate) || '',
          'Thiết bị/Vị trí': deviceName,
          'Người báo cáo': reporterName,
          'Nội dung sự cố': stripHtml(report.damageContent || ''),
          'Người xử lý': handlerName,
          'Trạng thái': report.statusName || statusMap[report.status as DamageReportStatus] || '',
          'Tiến độ xử lý': formatTimelineForExcel(report.handlerNotes || ''),
        };
      }

      const departmentName = report.reporterDepartmentName || deptMap.get(report.reportingDepartmentId) || 'N/A';
      
      return {
        'STT': index + 1,
        'ID': report.id,
        'Ngày báo cáo': formatDateDisplay(report.reportDate) || '',
        'Người báo cáo': reporterName,
        'Phòng ban': departmentName,
        'Người xử lý': handlerName,
        'Ngày xử lý': formatDateDisplay(report.handlingDate) || '',
        'Ngày hoàn thành': formatDateDisplay(report.completedDate) || '',
        'Thiết bị/Vị trí': deviceName,
        'Nội dung báo cáo': stripHtml(report.damageContent || ''),
        'Trạng thái': report.statusName || statusMap[report.status as DamageReportStatus] || '',
        'Mức độ': report.priorityName || priorityMap[report.priority as DamageReportPriority] || '',
        'Tiến độ xử lý': formatTimelineForExcel(report.handlerNotes || ''),
      };
    });

    // Generate filename
    const deptNameForFile = selectedDeptId > 0 
      ? finalDeptName.replace(/[^a-zA-Z0-9]/g, '_')
      : 'TatCa';
    const fileName = `BaoCao_${deptNameForFile}_${formatDateFilename(from)}_${formatDateFilename(to)}.xlsx`;

    // Generate Excel file
    let excelBuffer: Buffer;
    
    if (dailyMode) {
      const headers = ['STT', 'Mã số', 'Ngày báo cáo', 'Thiết bị/Vị trí', 'Người báo cáo', 'Nội dung sự cố', 'Người xử lý', 'Trạng thái', 'Tiến độ xử lý'];
      
      const mapToRow = (reports: any[]) => reports.map((r, idx) => {
        const reporterName = r.reporterName || staffMap.get(r.reporterId) || 'N/A';
        const handlerName = r.handlerName || (r.handlerId ? (staffMap.get(r.handlerId) || 'N/A') : 'Chưa phân công');
        
        const isMaintenance = r.maintenanceBatchId || (r.damageContent && (r.damageContent.toLowerCase().includes('bảo trì') || r.damageContent.toUpperCase().startsWith('BT ')));
        let deviceName = r.deviceName || (r.deviceId ? (deviceMap.get(r.deviceId) || 'N/A') : r.damageLocation || 'Khác');
        if (isMaintenance && (!r.deviceName || r.deviceName === '-')) {
          deviceName = 'Bảo trì';
        }

        return [
          idx + 1,
          r.id,
          formatDateDisplay(r.reportDate) || '',
          deviceName,
          reporterName,
          stripHtml(r.damageContent || ''),
          handlerName,
          r.statusName || statusMap[r.status as DamageReportStatus] || '',
          formatTimelineForExcel(r.handlerNotes || ''),
        ];
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
        },
        sections: [
          { title: 'Việc chưa xử lý', headers, rows: mapToRow(dataForSections.newReports) },
          { title: 'Việc đang làm chưa xong', headers, rows: mapToRow(dataForSections.activeReports) },
          { title: 'Việc đã xong', headers, rows: mapToRow(dataForSections.completedReports) },
          { title: 'Việc tồn đọng', headers, rows: mapToRow(dataForSections.pendingReports) },
        ],
      });
    } else {
      // Prepare data for standard Excel generation
      const headers = Object.keys(excelData[0] || []);
      const rows = excelData.map(row => Object.values(row));

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

