import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get overdue batches (count distinct maintenanceBatchId where at least one plan is overdue)
    const overdueBatchesResult = await pool.query(
      `
      SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text)) as count
      FROM "DeviceReminderPlan" p
      WHERE p."IsActive" = true
        AND p."NextDueDate" IS NOT NULL
        AND p."NextDueDate" < $1
      `,
      [today]
    );
    const overdueCount = parseInt(overdueBatchesResult.rows[0]?.count || '0', 10);

    // Get upcoming batches (count distinct maintenanceBatchId where at least one plan is upcoming)
    const upcomingBatchesResult = await pool.query(
      `
      SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text)) as count
      FROM "DeviceReminderPlan" p
      WHERE p."IsActive" = true
        AND p."NextDueDate" IS NOT NULL
        AND p."NextDueDate" >= $1
        AND p."NextDueDate" <= $2
      `,
      [today, nextWeek]
    );
    const upcomingCount = parseInt(upcomingBatchesResult.rows[0]?.count || '0', 10);

    // Get pending events (status = 'planned' or 'in_progress') that are maintenance-related
    const pendingEventsResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM "Event" e
      WHERE e."Status" IN ('planned', 'in_progress')
        AND (
          e."Metadata" IS NOT NULL 
          AND (
            e."Metadata" ? 'maintenanceBatchId'
            OR e."Metadata"::text LIKE '%maintenanceBatchId%'
          )
        )
      `
    );
    const pendingEventsCount = parseInt(pendingEventsResult.rows[0]?.count || '0', 10);

    return NextResponse.json({
      status: true,
      data: {
        overduePlans: overdueCount,
        upcomingPlans: upcomingCount,
        pendingEvents: pendingEventsCount,
      },
    });
  } catch (error: any) {
    console.error('Get maintenance notifications error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy thông báo bảo trì',
      },
      { status: 500 }
    );
  }
}

