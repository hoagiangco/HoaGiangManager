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

    const { isAdmin, getMaintenancePermissions } = await import('@/lib/auth/permissions');
    const payload = await request.json();
    let isAllowed = isAdmin(user.roles);

    if (!isAllowed) {
      // Check if it's a maintenance execution
      const metadataStr = typeof payload.metadata === 'string' ? payload.metadata : JSON.stringify(payload.metadata || {});
      if (metadataStr.includes('maintenanceBatchId')) {
         const perms = getMaintenancePermissions(user.roles);
         isAllowed = perms.canExecute || false;
      }
    }

    if (!isAllowed) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được cập nhật sự kiện' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { status: false, error: 'Dữ liệu sự kiện không hợp lệ' },
        { status: 400 }
      );
    }

    const parseDate = (value: any) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const parseMetadata = (value: any) => {
      if (!value) return null;
      if (typeof value === 'object') {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        try {
          return JSON.parse(value);
        } catch (error) {
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
    if (!eventTypeId || Number.isNaN(eventTypeId)) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng chọn loại sự kiện' },
        { status: 400 }
      );
    }

    const eventData = {
      id,
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
      metadata,
      updatedBy: user.userId,
    };
    
    const eventService = new EventService();
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
    const result = await eventService.delete(id);

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




