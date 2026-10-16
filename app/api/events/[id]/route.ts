import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventService } from '@/lib/services/eventService';
import { EventStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    const eventService = new EventService();
    const event = await eventService.getById(id);

    return NextResponse.json({
      status: event !== null,
      data: event
    });
  } catch (error: any) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { status: false, error: 'ID sự kiện không hợp lệ' },
        { status: 400 }
      );
    }

    const eventService = new EventService();
    const existingEvent = await eventService.getById(id);
    if (!existingEvent) {
      return NextResponse.json(
        { status: false, error: 'Sự kiện không tồn tại' },
        { status: 404 }
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
    let isMaintenanceExecution = false;

    if (!isUserAdmin) {
      // Non-admin can only update if event ACTUALLY belongs to a maintenance batch in the database
      const existingBatchId = existingEvent.metadata?.maintenanceBatchId || existingEvent.metadata?.batchId;
      if (existingBatchId) {
        const perms = getMaintenancePermissions(user.roles);
        if (perms.canExecute) {
          isMaintenanceExecution = true;
        }
      }

      if (!isMaintenanceExecution) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Chỉ quản trị viên mới được cập nhật sự kiện này' },
          { status: 403 }
        );
      }
    }

    const parseDate = (value: any) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

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

    const eventTypeId = Number(payload.eventTypeId);
    if (isUserAdmin && (!eventTypeId || Number.isNaN(eventTypeId))) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng chọn loại sự kiện' },
        { status: 400 }
      );
    }

    // Role-based field enforcement: non-admins can only modify execution fields
    const eventData = {
      id,
      title: isUserAdmin ? (payload.title?.trim() || null) : existingEvent.title,
      deviceId: isUserAdmin ? (payload.deviceId ? Number(payload.deviceId) : null) : existingEvent.deviceId,
      eventTypeId: isUserAdmin ? eventTypeId : existingEvent.eventTypeId,
      description: isUserAdmin ? (payload.description?.trim() || '') : (existingEvent.description || ''),
      notes: payload.notes !== undefined ? (payload.notes?.trim() || '') : (existingEvent.notes || ''),
      status: (payload.status as EventStatus) || existingEvent.status,
      eventDate: parseDate(payload.eventDate) || existingEvent.eventDate,
      startDate: parseDate(payload.startDate) || existingEvent.startDate,
      endDate: parseDate(payload.endDate) || existingEvent.endDate,
      staffId: isUserAdmin ? (payload.staffId ? Number(payload.staffId) : null) : existingEvent.staffId,
      relatedReportId: isUserAdmin ? (payload.relatedReportId ? Number(payload.relatedReportId) : null) : existingEvent.relatedReportId,
      metadata: isUserAdmin ? metadata : { ...existingEvent.metadata, ...(metadata || {}) },
      updatedBy: user.userId,
    };
    
    await eventService.update(eventData);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi cập nhật sự kiện'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xóa sự kiện' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    console.log(`Deleting event ${id}`);
    
    const eventService = new EventService();
    const existingEvent = await eventService.getById(id);
    const result = await eventService.delete(id);

    const { logAudit } = await import('@/lib/services/auditService');
    await logAudit(null, user.userId, 'DELETE', 'Events', id.toString(), { title: existingEvent?.title }, null);

    console.log(`Event ${id} deleted:`, result);

    return NextResponse.json({
      status: result,
      message: 'Xóa thành công'
    });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi xóa sự kiện'
      },
      { status: 500 }
    );
  }
}
