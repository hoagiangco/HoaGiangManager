import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventTypeService } from '@/lib/services/eventTypeService';
import { EventStatus, EventType, EventCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventTypeService = new EventTypeService();
    const eventTypes = await eventTypeService.getAll();

    return NextResponse.json({
      status: true,
      data: eventTypes
    });
  } catch (error: any) {
    console.error('Get event types error:', error);
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
        { status: false, error: 'Dữ liệu loại sự kiện không hợp lệ' },
        { status: 400 }
      );
    }

    const clean: Omit<EventType, 'id'> = {
      name: String(payload.name || '').trim(),
      code: payload.code ? String(payload.code).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      category: payload.category ? (String(payload.category).trim() as EventCategory) : null,
      color: payload.color ? String(payload.color).trim() : null,
      isReminder: Boolean(payload.isReminder),
      defaultStatus: payload.defaultStatus ? (String(payload.defaultStatus).trim() as EventStatus) : EventStatus.Planned,
      defaultLeadTimeDays: payload.defaultLeadTimeDays !== undefined && payload.defaultLeadTimeDays !== null
        ? Number(payload.defaultLeadTimeDays)
        : null,
    };

    if (!clean.name) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng nhập tên loại sự kiện' },
        { status: 400 }
      );
    }

    if (clean.defaultLeadTimeDays !== null && Number.isNaN(clean.defaultLeadTimeDays)) {
      return NextResponse.json(
        { status: false, error: 'Khoảng thời gian mặc định không hợp lệ' },
        { status: 400 }
      );
    }

    const eventTypeService = new EventTypeService();
    const id = await eventTypeService.create(clean);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create event type error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi tạo loại sự kiện' },
      { status: 500 }
    );
  }
}

