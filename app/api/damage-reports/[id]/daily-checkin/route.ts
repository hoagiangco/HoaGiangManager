import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { StaffService } from '@/lib/services/staffService';
import { DamageReportService } from '@/lib/services/damageReportService';
import pool from '@/lib/db';

// GET: Lấy trạng thái check-in của báo cáo (đã check-in hôm nay chưa?)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const reportId = parseInt(params.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ status: false, error: 'ID không hợp lệ' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const workDate = dateParam || new Date().toISOString().split('T')[0];

    // Get staff ID for current user
    const staffService = new StaffService();
    const staff = await staffService.getByUserId(user.userId);

    if (!staff) {
      return NextResponse.json({ status: false, error: 'Không tìm thấy thông tin nhân viên' }, { status: 404 });
    }

    // Check today's check-in
    const result = await pool.query(
      `SELECT dwl.*, s."Name" as "staffName"
       FROM "DailyWorkLog" dwl
       JOIN "Staff" s ON s."ID" = dwl."StaffID"
       WHERE dwl."DamageReportID" = $1 AND dwl."WorkDate" = $2::date AND dwl."StaffID" = $3`,
      [reportId, workDate, staff.id]
    );

    // Also get all logs for this report (history)
    const historyResult = await pool.query(
      `SELECT dwl."WorkDate", dwl."Notes", s."Name" as "staffName"
       FROM "DailyWorkLog" dwl
       JOIN "Staff" s ON s."ID" = dwl."StaffID"
       WHERE dwl."DamageReportID" = $1
       ORDER BY dwl."WorkDate" DESC
       LIMIT 30`,
      [reportId]
    );

    return NextResponse.json({
      status: true,
      data: {
        checkedIn: result.rows.length > 0,
        todayLog: result.rows[0] || null,
        history: historyResult.rows,
      }
    });
  } catch (error: any) {
    console.error('Get daily checkin error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

// POST: Check-in - ghi nhận đang xử lý hôm nay
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const reportId = parseInt(params.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ status: false, error: 'ID không hợp lệ' }, { status: 400 });
    }

    // Check report exists and is in a valid state
    const reportRes = await pool.query(
      `SELECT "ID", "Status", "HandlerID" FROM "DamageReport" WHERE "ID" = $1`,
      [reportId]
    );

    if (reportRes.rows.length === 0) {
      return NextResponse.json({ status: false, error: 'Báo cáo không tồn tại' }, { status: 404 });
    }

    const report = reportRes.rows[0];
    const statusNum = Number(report.Status);

    // Only allow check-in for active reports (not completed/cancelled/rejected)
    if (statusNum === 4 || statusNum === 5 || statusNum === 6) {
      return NextResponse.json(
        { status: false, error: 'Không thể ghi nhận cho báo cáo đã hoàn thành hoặc đã hủy' },
        { status: 400 }
      );
    }

    // Get staff for current user
    const staffService = new StaffService();
    const staff = await staffService.getByUserId(user.userId);
    if (!staff) {
      return NextResponse.json({ status: false, error: 'Không tìm thấy thông tin nhân viên' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const notes: string = body.notes || '';
    const workDate: string = body.workDate || new Date().toISOString().split('T')[0];

    // UPSERT: insert or update if already checked in today
    const result = await pool.query(
      `INSERT INTO "DailyWorkLog" ("DamageReportID", "StaffID", "WorkDate", "Notes", "UpdatedAt")
       VALUES ($1, $2, $3::date, $4, CURRENT_TIMESTAMP)
       ON CONFLICT ("DamageReportID", "StaffID", "WorkDate")
       DO UPDATE SET "Notes" = EXCLUDED."Notes", "UpdatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [reportId, staff.id, workDate, notes]
    );

    // Auto-append to timeline
    const damageReportService = new DamageReportService();
    const autoNote = notes ? `Ghi nhận xử lý hôm nay: ${notes}` : 'Ghi nhận xử lý hôm nay';
    await damageReportService.appendTimelineNote(reportId, autoNote, 'auto', staff.name, user.userId);

    return NextResponse.json({
      status: true,
      data: result.rows[0],
      message: 'Đã ghi nhận làm việc hôm nay'
    });
  } catch (error: any) {
    console.error('Daily checkin error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

// DELETE: Hủy check-in hôm nay
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const reportId = parseInt(params.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ status: false, error: 'ID không hợp lệ' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const workDate = dateParam || new Date().toISOString().split('T')[0];

    const staffService = new StaffService();
    const staff = await staffService.getByUserId(user.userId);
    if (!staff) {
      return NextResponse.json({ status: false, error: 'Không tìm thấy thông tin nhân viên' }, { status: 404 });
    }

    await pool.query(
      `DELETE FROM "DailyWorkLog" 
       WHERE "DamageReportID" = $1 AND "StaffID" = $2 AND "WorkDate" = $3::date`,
      [reportId, staff.id, workDate]
    );

    // Auto-append to timeline
    const damageReportService = new DamageReportService();
    await damageReportService.appendTimelineNote(reportId, 'Đã hủy ghi nhận xử lý hôm nay', 'auto', staff.name, user.userId);

    return NextResponse.json({ status: true, message: 'Đã hủy ghi nhận' });
  } catch (error: any) {
    console.error('Delete daily checkin error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
