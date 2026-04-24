import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventService } from '@/lib/services/eventService';
import { EventStatus } from '@/types';

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

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được tạo sự kiện' },
        { status: 403 }
      );
    }

    const payload = await request.json();

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
      title: payload.title?.trim() || null,
      deviceId: payload.deviceId ? Number(payload.deviceId) : null,
      eventTypeId,
      description: payload.description?.trim() || null,
      notes: payload.notes?.trim() || null,
      status: (payload.status as EventStatus) || EventStatus.Planned,
      eventDate: parseDate(payload.eventDate),
      startDate: parseDate(payload.startDate),
      endDate: parseDate(payload.endDate),
      staffId: payload.staffId ? Number(payload.staffId) : null,
      relatedReportId: payload.relatedReportId ? Number(payload.relatedReportId) : null,
      metadata: metadata || null,
      createdBy: user.userId,
      createdAt: new Date(),
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    const eventService = new EventService();
    const id = await eventService.create(eventData);

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

