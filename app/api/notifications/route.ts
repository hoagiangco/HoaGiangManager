import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { NotificationService, NotificationType, NotificationCategory } from '@/lib/services/notificationService';

async function checkUpcomingMaintenance(isAdmin: boolean, staffId?: number) {
  if (!isAdmin) return; // Only admins get upcoming maintenance notifications for now

  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Get count of upcoming maintenance
    const upcomingRes = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'id-' || p."ID"::text)) as count
       FROM "DeviceReminderPlan" p
       WHERE p."IsActive" = true
         AND p."NextDueDate" IS NOT NULL
         AND p."NextDueDate" >= $1
         AND p."NextDueDate" <= $2`,
      [today, nextWeek]
    );

    const upcomingCount = parseInt(upcomingRes.rows[0]?.count || '0');

    if (upcomingCount > 0) {
      const title = `Có ${upcomingCount} bảo trì sắp đến hạn 📅`;
      
      // Check if we already have an UNREAD notification with same title today
      const existingRes = await pool.query(
        `SELECT "ID" FROM "Notification" 
         WHERE "Title" = $1 AND "IsRead" = false AND "CreatedAt" >= CURRENT_DATE`,
        [title]
      );

      if (existingRes.rows.length === 0) {
        const ns = new NotificationService();
        await ns.createNotification({
          title: title,
          content: `Có ${upcomingCount} đợt bảo trì dự kiến thực hiện trong 7 ngày tới.`,
          type: NotificationType.Maintenance,
          category: NotificationCategory.Upcoming,
          targetUrl: '/dashboard/maintenance',
        });
      }
    }
  } catch (err) {
    console.error('Error checking upcoming maintenance in API:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const isAdmin = user.roles && user.roles.includes('Admin');

    const staffRes = await pool.query('SELECT "ID" FROM "Staff" WHERE "UserId" = $1', [user.userId]);
    const staffId = staffRes.rows[0]?.ID;

    // Trigger lazy check for upcoming maintenance
    if (isAdmin) {
      await checkUpcomingMaintenance(isAdmin, staffId);
    }
    let query = `
      SELECT 
        "ID" as id,
        "Title" as title,
        "Content" as content,
        "Type" as type,
        "Category" as category,
        "TargetUrl" as "targetUrl",
        "StaffId" as "staffId",
        "IsRead" as "isRead",
        "CreatedAt" as "createdAt"
      FROM "Notification"
      WHERE "IsRead" = false
    `;

    const params: any[] = [];
    
    if (!isAdmin) {
      // For non-admins, they only see notifications specifically for them (matching their StaffId)
      // We need to find their StaffId first.
      const staffRes = await pool.query('SELECT "ID" FROM "Staff" WHERE "UserId" = $1', [user.userId]);
      const staffId = staffRes.rows[0]?.ID;
      
      if (staffId) {
        query += ` AND "StaffId" = $1`;
        params.push(staffId);
      } else {
        // If no staff linked, return empty
        return NextResponse.json({ status: true, data: [] });
      }
    } else {
      // Admins see all notifications (StaffId is NULL or matches theirs if we want specifically for them)
      // Usually, "broadcast" notifications have StaffId = NULL
      query += ` AND ("StaffId" IS NULL OR "StaffId" IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $1))`;
      params.push(user.userId);
    }

    query += ` ORDER BY "CreatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      status: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

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
    const { notificationId, all = false } = body;

    if (all) {
      // Mark all as read for this user/admin
      if (user.roles?.includes('Admin')) {
        await pool.query('UPDATE "Notification" SET "IsRead" = true WHERE "IsRead" = false');
      } else {
        const staffRes = await pool.query('SELECT "ID" FROM "Staff" WHERE "UserId" = $1', [user.userId]);
        const staffId = staffRes.rows[0]?.ID;
        if (staffId) {
          await pool.query('UPDATE "Notification" SET "IsRead" = true WHERE "StaffId" = $1 AND "IsRead" = false', [staffId]);
        }
      }
    } else if (notificationId) {
      await pool.query('UPDATE "Notification" SET "IsRead" = true WHERE "ID" = $1', [notificationId]);
    }

    return NextResponse.json({ status: true });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
