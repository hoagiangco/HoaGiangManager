import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceReminderPlanService } from '@/lib/services/deviceReminderPlanService';
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

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const notificationDaysParam = searchParams.get('notificationDays');

    const days = daysParam ? parseInt(daysParam, 10) : 7;
    const notificationDays = notificationDaysParam
      ? notificationDaysParam.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !isNaN(d))
      : [];

    if (isNaN(days) || days <= 0) {
      return NextResponse.json(
        { status: false, error: 'Days phải là số nguyên dương' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    // Get upcoming reminder plans
    const result = await pool.query(
      `
      SELECT 
        p."ID" as id,
        p."DeviceID" as "deviceId",
        d."Name" as "deviceName",
        p."Title" as title,
        p."Description" as description,
        p."NextDueDate" as "nextDueDate",
        p."Metadata" as metadata,
        p."IsActive" as "isActive"
      FROM "DeviceReminderPlan" p
      INNER JOIN "Device" d ON p."DeviceID" = d."ID"
      WHERE p."IsActive" = true
        AND p."NextDueDate" IS NOT NULL
        AND p."NextDueDate" >= $1
        AND p."NextDueDate" <= $2
      ORDER BY p."NextDueDate" ASC
      `,
      [today, futureDate]
    );

    const upcomingPlans = result.rows.map((row: any) => {
      let metadata: Record<string, any> | null = null;
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata);
          } catch (error) {
            metadata = null;
          }
        } else {
          metadata = row.metadata;
        }
      }

      const nextDueDate = row.nextDueDate ? new Date(row.nextDueDate) : null;
      const daysUntilDue = nextDueDate
        ? Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: row.id,
        deviceId: row.deviceId,
        deviceName: row.deviceName,
        nextDueDate: nextDueDate ? nextDueDate.toISOString().split('T')[0] : null,
        daysUntilDue,
        title: row.title,
        description: row.description,
        maintenanceType: metadata?.maintenanceType || null,
        maintenanceProvider: metadata?.maintenanceProvider || null,
        maintenanceBatchId: metadata?.maintenanceBatchId || null,
        shouldNotify: notificationDays.length === 0 || (daysUntilDue !== null && notificationDays.includes(daysUntilDue)),
      };
    });

    // Filter by notification days if specified
    const filteredPlans = notificationDays.length > 0
      ? upcomingPlans.filter((plan) => plan.shouldNotify)
      : upcomingPlans;

    return NextResponse.json({
      status: true,
      data: filteredPlans,
    });
  } catch (error: any) {
    console.error('Get upcoming reminder plans error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy danh sách kế hoạch sắp đến hạn',
      },
      { status: 500 }
    );
  }
}

