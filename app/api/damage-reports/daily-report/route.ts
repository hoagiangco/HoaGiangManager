import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { formatDateDisplay, formatDateFilename } from '@/lib/utils/dateFormat';
import { generateDailyReportExcel } from '@/lib/utils/excelGenerator.server';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or manager
    const isAdminUser = user.roles && (user.roles.includes('Admin') || user.roles.includes('Manager'));
    if (!isAdminUser) {
      return NextResponse.json(
        { status: false, error: 'Chỉ admin hoặc manager mới có quyền xuất báo cáo ngày' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const damageReportService = new DamageReportService();
    const data = await damageReportService.getDailyReportData(targetDate);

    // Prepare sections for Excel
    const sections = [
      {
        title: 'Việc mới báo báo hôm nay',
        headers: ['ID', 'Thời gian', 'Thiết bị/Vị trí', 'Nội dung hư hỏng', 'Người báo', 'Mức độ'],
        rows: data.newReports.map(r => [
          r.id,
          formatDateDisplay(r.reportDate),
          r.deviceName || r.damageLocation || 'N/A',
          r.damageContent,
          r.reporterName,
          r.priorityName
        ])
      },
      {
        title: 'Việc đã hoàn thành hôm nay',
        headers: ['ID', 'Thiết bị/Vị trí', 'Nội dung', 'Người xử lý', 'Ngày hoàn thành', 'Ghi chú'],
        rows: data.completedReports.map(r => [
          r.id,
          r.deviceName || r.damageLocation || 'N/A',
          r.damageContent,
          r.handlerName,
          formatDateDisplay(r.completedDate),
          r.handlerNotes || ''
        ])
      },
      {
        title: 'Danh sách việc đang tồn đọng',
        headers: ['ID', 'Ngày báo', 'Thiết bị/Vị trí', 'Nội dung', 'Trạng thái', 'Người xử lý'],
        rows: data.pendingReports.map(r => [
          r.id,
          formatDateDisplay(r.reportDate),
          r.deviceName || r.damageLocation || 'N/A',
          r.damageContent,
          r.statusName,
          r.handlerName || 'Chưa phân công'
        ])
      }
    ];

    const fileName = `BaoCaoNgay_${formatDateFilename(targetDate)}.xlsx`;

    const excelBuffer = await generateDailyReportExcel({
      title: 'BÁO CÁO CÔNG VIỆC HÀNG NGÀY',
      date: formatDateDisplay(targetDate),
      summary: data.summary,
      sections: sections
    });

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Export Daily Report error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi xuất báo cáo: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  }
}
