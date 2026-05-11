import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { getVNTodayStr } from '@/lib/utils/dateFormat';

export const dynamic = 'force-dynamic';

// GET: Lấy tất cả check-in của ngày hôm nay (hoặc ngày cụ thể)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const workDate = dateParam || getVNTodayStr();

    // Lấy tất cả log trong ngày
    const result = await pool.query(
      `SELECT dwl.*, s."Name" as "staffName"
       FROM "DailyWorkLog" dwl
       JOIN "Staff" s ON s."ID" = dwl."StaffID"
       WHERE dwl."WorkDate" = $1::date`,
      [workDate]
    );

    return NextResponse.json({
      status: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Get all daily checkins error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Lỗi server' }, { status: 500 });
  }
}
