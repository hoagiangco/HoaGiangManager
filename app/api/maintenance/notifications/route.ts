import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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

    const summaryResult = await pool.query(
      `
      WITH current_staff AS (
        SELECT "ID" FROM "Staff" WHERE "UserId" = $4
      ),
      scoped_plans AS (
        SELECT
          COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text) AS batch_id,
          p."NextDueDate" AS next_due_date
        FROM "DeviceReminderPlan" p
        WHERE p."IsActive" = true
          AND p."NextDueDate" IS NOT NULL
          AND (
            $3::boolean = true
            OR (
              p."Metadata" ? 'assignedStaffId'
              AND (p."Metadata"->>'assignedStaffId') ~ '^[0-9]+$'
              AND (p."Metadata"->>'assignedStaffId')::integer IN (SELECT "ID" FROM current_staff)
            )
          )
      ),
      plan_summary AS (
        SELECT
          COUNT(DISTINCT batch_id) FILTER (WHERE next_due_date < $1) AS overdue_batches,
          COUNT(*) FILTER (WHERE next_due_date < $1) AS overdue_devices,
          COUNT(DISTINCT batch_id) FILTER (WHERE next_due_date >= $1 AND next_due_date <= $2) AS upcoming_batches,
          COUNT(*) FILTER (WHERE next_due_date >= $1 AND next_due_date <= $2) AS upcoming_devices
        FROM scoped_plans
      ),
      scoped_events AS (
        SELECT
          COALESCE(e."Metadata"->>'maintenanceBatchId', 'event-' || e."ID"::text) AS batch_id,
          e."Status" AS status
        FROM "Event" e
        WHERE e."Status" IN ('planned', 'in_progress')
          AND e."Metadata" IS NOT NULL
          AND e."Metadata" ? 'maintenanceBatchId'
          AND (
            $3::boolean = true
            OR e."StaffID" IN (SELECT "ID" FROM current_staff)
          )
      ),
      event_summary AS (
        SELECT
          COUNT(DISTINCT batch_id) AS pending_batches,
          COUNT(*) AS pending_devices,
          COUNT(DISTINCT batch_id) FILTER (WHERE status = 'planned') AS planned_batches,
          COUNT(*) FILTER (WHERE status = 'planned') AS planned_devices,
          COUNT(DISTINCT batch_id) FILTER (WHERE status = 'in_progress') AS in_progress_batches,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_devices
        FROM scoped_events
      )
      SELECT
        COALESCE(ps.overdue_batches, 0)::int AS "overdueBatches",
        COALESCE(ps.overdue_devices, 0)::int AS "overdueDevices",
        COALESCE(ps.upcoming_batches, 0)::int AS "upcomingBatches",
        COALESCE(ps.upcoming_devices, 0)::int AS "upcomingDevices",
        COALESCE(es.pending_batches, 0)::int AS "pendingBatches",
        COALESCE(es.pending_devices, 0)::int AS "pendingDevices",
        COALESCE(es.planned_batches, 0)::int AS "plannedBatches",
        COALESCE(es.planned_devices, 0)::int AS "plannedDevices",
        COALESCE(es.in_progress_batches, 0)::int AS "inProgressBatches",
        COALESCE(es.in_progress_devices, 0)::int AS "inProgressDevices"
      FROM plan_summary ps
      CROSS JOIN event_summary es
      `,
      [today, nextMonth, isAdmin, userId]
    );

    const summary = summaryResult.rows[0] || {};

    return NextResponse.json({
      status: true,
      data: {
        // Backward compatible fields: overdue/upcoming are batch-level; pendingEvents is device/event-level.
        overduePlans: summary.overdueBatches || 0,
        upcomingPlans: summary.upcomingBatches || 0,
        pendingEvents: summary.pendingDevices || 0,
        batches: {
          overdue: summary.overdueBatches || 0,
          upcoming: summary.upcomingBatches || 0,
          pending: summary.pendingBatches || 0,
          planned: summary.plannedBatches || 0,
          inProgress: summary.inProgressBatches || 0,
        },
        devices: {
          overdue: summary.overdueDevices || 0,
          upcoming: summary.upcomingDevices || 0,
          pending: summary.pendingDevices || 0,
          planned: summary.plannedDevices || 0,
          inProgress: summary.inProgressDevices || 0,
        },
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
