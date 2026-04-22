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
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const isAdmin = user.roles && user.roles.includes('Admin');
    const userId = user.userId;

    // Build Overdue Query
    let overdueQuery = `
      SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text)) as count
      FROM "DeviceReminderPlan" p
      WHERE p."IsActive" = true
        AND p."NextDueDate" IS NOT NULL
        AND p."NextDueDate" < $1
    `;
    const overdueParams: any[] = [today];
    if (!isAdmin) {
      overdueQuery += ` AND (
        p."Metadata" ? 'assignedStaffId' AND 
        (p."Metadata"->>'assignedStaffId') ~ '^[0-9]+$' AND
        (p."Metadata"->>'assignedStaffId')::integer IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $2)
      )`;
      overdueParams.push(userId);
    }
    const overdueBatchesResult = await pool.query(overdueQuery, overdueParams);
    const overdueCount = parseInt(overdueBatchesResult.rows[0]?.count || '0', 10);

    // Build Upcoming Query
    let upcomingQuery = `
      SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text)) as count
      FROM "DeviceReminderPlan" p
      WHERE p."IsActive" = true
        AND p."NextDueDate" IS NOT NULL
        AND p."NextDueDate" >= $1
        AND p."NextDueDate" <= $2
    `;
    const upcomingParams: any[] = [today, nextMonth];
    if (!isAdmin) {
      upcomingQuery += ` AND (
        p."Metadata" ? 'assignedStaffId' AND 
        (p."Metadata"->>'assignedStaffId') ~ '^[0-9]+$' AND
        (p."Metadata"->>'assignedStaffId')::integer IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $3)
      )`;
      upcomingParams.push(userId);
    }
    const upcomingBatchesResult = await pool.query(upcomingQuery, upcomingParams);
    const upcomingCount = parseInt(upcomingBatchesResult.rows[0]?.count || '0', 10);

    // Build Pending Events Query
    let pendingEventsQuery = `
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
    `;
    const pendingEventsParams: any[] = [];
    if (!isAdmin) {
      pendingEventsQuery += ` AND e."StaffId" IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $1)`;
      pendingEventsParams.push(userId);
    }
    const pendingEventsResult = await pool.query(pendingEventsQuery, pendingEventsParams);
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

