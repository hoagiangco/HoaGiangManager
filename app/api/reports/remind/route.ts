import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { NotificationService, NotificationType, NotificationCategory } from '@/lib/services/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json(
        { status: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Get report details and handler
    const reportQuery = `
      SELECT r."ID", r."Status", r."HandlerID", r."DamageLocation", r."DamageContent", d."Name" as "DeviceName"
      FROM "DamageReport" r
      LEFT JOIN "Device" d ON r."DeviceID" = d."ID"
      WHERE r."ID" = $1
    `;
    const reportRes = await pool.query(reportQuery, [reportId]);

    if (reportRes.rows.length === 0) {
      return NextResponse.json({ status: false, error: 'Report not found' }, { status: 404 });
    }

    const report = reportRes.rows[0];

    if (!report.HandlerID) {
      return NextResponse.json({ status: false, error: 'Report is not assigned to anyone' }, { status: 400 });
    }

    const statusNum = parseInt(report.Status, 10);
    // Allow reminding if status is Pending (1), Assigned (2) or InProgress (3)
    if (statusNum !== 1 && statusNum !== 2 && statusNum !== 3) {
      return NextResponse.json({ status: false, error: 'Báo cáo không ở trạng thái cần nhắc việc.' }, { status: 400 });
    }

    const locationName = report.DeviceName || report.DamageLocation || 'Không rõ vị trí';
    
    const ns = new NotificationService();
    await ns.createNotification({
      title: '🔔 Nhắc nhở tiến độ công việc',
      content: `Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #${report.ID} (${locationName}). Vui lòng sớm hoàn thành.`,
      type: NotificationType.Report,
      category: NotificationCategory.Reminder,
      targetUrl: '/dashboard/damage-reports',
      staffId: report.HandlerID,
      createdBy: user.email,
      excludeUserId: user.userId
    });

    return NextResponse.json({ status: true, message: 'Đã gửi nhắc việc thành công.' });
  } catch (error: any) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
