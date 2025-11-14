import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { StaffService } from '@/lib/services/staffService';
import { DepartmentService } from '@/lib/services/departmentService';
import { DeviceService } from '@/lib/services/deviceService';
import { DamageReportStatus, DamageReportPriority } from '@/types';
import { formatDateDisplay, formatDateTime, formatDateRange, formatDateFilename } from '@/lib/utils/dateFormat';
import { generateExcelFile } from '@/lib/utils/excelGenerator.server';

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

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng chọn khoảng thời gian' },
        { status: 400 }
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    if (from > to) {
      return NextResponse.json(
        { status: false, error: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc' },
        { status: 400 }
      );
    }

    // Get all reports
    const damageReportService = new DamageReportService();
    const filters: any = {
      currentUserId: user.userId,
      isAdmin: true
    };
    
    if (departmentId && parseInt(departmentId) > 0) {
      filters.departmentId = parseInt(departmentId);
    }

    // Get department name for error message
    const selectedDeptId = departmentId ? parseInt(departmentId) : 0;
    let selectedDeptName = 'Tất cả';
    if (selectedDeptId > 0) {
      const departmentService = new DepartmentService();
      const department = await departmentService.getById(selectedDeptId);
      selectedDeptName = department?.name || 'N/A';
    }

    const allReports = await damageReportService.getAll(filters);

    // Log for debugging
    console.log('Export filter:', {
      departmentId: departmentId || 'Tất cả',
      fromDate,
      toDate,
      totalReports: allReports.length
    });

    // Filter by date range
    const filteredReports = allReports.filter(report => {
      if (!report.reportDate) return false;
      const reportDate = new Date(report.reportDate);
      reportDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      return reportDate >= from && reportDate <= to;
    });

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
    const departmentService = new DepartmentService();
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

    const excelData = filteredReports.map(report => {
      const reporterName = staffMap.get(report.reporterId) || 'N/A';
      const handlerName = report.handlerId ? (staffMap.get(report.handlerId) || 'N/A') : 'Chưa phân công';
      const departmentName = deptMap.get(report.reportingDepartmentId) || 'N/A';
      const deviceName = report.deviceId ? (deviceMap.get(report.deviceId) || 'N/A') : report.damageLocation || 'Khác';

      return {
        'ID': report.id,
        'Ngày báo cáo': formatDateDisplay(report.reportDate) || '',
        'Người báo cáo': reporterName,
        'Phòng ban': departmentName,
        'Người xử lý': handlerName,
        'Ngày phân công': formatDateDisplay(report.assignedDate) || '',
        'Ngày xử lý': formatDateDisplay(report.handlingDate) || '',
        'Ngày hoàn thành': formatDateDisplay(report.completedDate) || '',
        'Thiết bị/Vị trí': deviceName,
        'Nội dung hư hỏng': report.damageContent || '',
        'Trạng thái': statusMap[report.status] || '',
        'Mức độ ưu tiên': priorityMap[report.priority] || '',
        'Ghi chú': report.notes || '',
        'Ghi chú người xử lý': report.handlerNotes || '',
        'Ngày tạo': formatDateTime(report.createdAt) || '',
        'Người cập nhật': report.updatedByName || '',
      };
    });

    // Generate filename
    const deptNameForFile = selectedDeptId > 0 
      ? finalDeptName.replace(/[^a-zA-Z0-9]/g, '_')
      : 'TatCa';
    const fileName = `BaoCaoHuHong_${deptNameForFile}_${formatDateFilename(from)}_${formatDateFilename(to)}.xlsx`;

    // Prepare data for Excel generation
    const headers = Object.keys(excelData[0] || []);
    const rows = excelData.map(row => Object.values(row));

    // Generate Excel file using utility function
    const excelBuffer = await generateExcelFile({
      title: 'BÁO CÁO HƯ HỎNG',
      department: finalDeptName,
      dateRange: `Từ ngày: ${formatDateRange(from, to)}`,
      headers,
      rows,
      fileName,
    });

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

