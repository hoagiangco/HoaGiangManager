import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventService } from '@/lib/services/eventService';
import { EventStatus } from '@/types';
import { getVNNow } from '@/lib/utils/dateFormat';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const eventTypeId = parseInt(searchParams.get('eventTypeId') || '0');

    const eventService = new EventService();
    const events = await eventService.getEventByType(eventTypeId);

    return NextResponse.json({
      status: true,
      data: events
    });
  } catch (error: any) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
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

    const payload = await request.json();
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { status: false, error: 'Dữ liệu sự kiện không hợp lệ' },
        { status: 400 }
      );
    }

    const { isAdmin, getMaintenancePermissions } = await import('@/lib/auth/permissions');
    const isUserAdmin = isAdmin(user.roles);

    const parseMetadata = (value: any) => {
      if (!value) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string' && value.trim()) {
        try {
          return JSON.parse(value);
        } catch {
          throw new Error('Metadata phải là JSON hợp lệ');
        }
      }
      return null;
    };

    let metadata: Record<string, any> | null = null;
    try {
      metadata = parseMetadata(payload.metadata);
    } catch (metadataError: any) {
      return NextResponse.json(
        { status: false, error: metadataError.message || 'Metadata phải là JSON hợp lệ' },
        { status: 400 }
      );
    }

    if (!isUserAdmin) {
      // Non-admins can only create events for existing, active maintenance plans/batches
      const perms = getMaintenancePermissions(user.roles);
      if (!perms.canExecute) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Bạn không có quyền tạo sự kiện' },
          { status: 403 }
        );
      }

      const batchId = metadata?.maintenanceBatchId || metadata?.batchId;
      const planId = metadata?.maintenancePlanId;

      if (!batchId && !planId) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Chỉ quản trị viên mới được tạo sự kiện thông thường' },
          { status: 403 }
        );
      }

      // Verify batchId / planId strictly exists in database
      const checkPlan = await pool.query(
        `SELECT "ID" FROM "DeviceReminderPlan" 
         WHERE (
           ($1 <> '' AND "Metadata"->>'maintenanceBatchId' = $1)
           OR ($2 > 0 AND "ID" = $2)
         ) AND "IsActive" = true
         LIMIT 1`,
        [batchId ? String(batchId) : '', Number(planId) || 0]
      );

      if (checkPlan.rows.length === 0) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Kế hoạch bảo trì không tồn tại hoặc đã ngừng hoạt động' },
          { status: 403 }
        );
      }
    }

    const parseDate = (value: any) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const eventTypeId = Number(payload.eventTypeId);
    if (!eventTypeId || Number.isNaN(eventTypeId)) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng chọn loại sự kiện' },
        { status: 400 }
      );
    }

    const eventData = {
      title: payload.title?.trim() || null,
      deviceId: payload.deviceId ? Number(payload.deviceId) : null,
      eventTypeId,
      description: payload.description?.trim() || '', // NOT NULL in DB
      notes: payload.notes?.trim() || '',  // NOT NULL in DB
      status: (payload.status as EventStatus) || EventStatus.Planned,
      eventDate: parseDate(payload.eventDate),
      startDate: parseDate(payload.startDate),
      endDate: parseDate(payload.endDate),
      staffId: payload.staffId ? Number(payload.staffId) : null,
      relatedReportId: payload.relatedReportId ? Number(payload.relatedReportId) : null,
      metadata: metadata || null,
      createdBy: user.userId,
      createdAt: getVNNow(),
      updatedBy: user.userId,
      updatedAt: getVNNow(),
    };

    const eventService = new EventService();
    const id = await eventService.create(eventData);

    const { logAudit } = await import('@/lib/services/auditService');
    await logAudit(null, user.userId, 'CREATE', 'Events', id.toString(), null, { title: eventData.title, status: eventData.status });

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi tạo sự kiện' },
      { status: 500 }
    );
  }
}
