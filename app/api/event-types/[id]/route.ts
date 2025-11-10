import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventTypeService } from '@/lib/services/eventTypeService';
import { EventCategory, EventStatus } from '@/types';

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
    const eventTypeService = new EventTypeService();
    const eventType = await eventTypeService.getById(id);

    return NextResponse.json({
      status: eventType !== null,
      data: eventType
    });
  } catch (error: any) {
    console.error('Get event type error:', error);
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
    const payload = await request.json();

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { status: false, error: 'Dữ liệu loại sự kiện không hợp lệ' },
        { status: 400 }
      );
    }

    const defaultLeadTimeDays =
      payload.defaultLeadTimeDays !== undefined && payload.defaultLeadTimeDays !== null
        ? Number(payload.defaultLeadTimeDays)
        : null;

    if (defaultLeadTimeDays !== null && Number.isNaN(defaultLeadTimeDays)) {
      return NextResponse.json(
        { status: false, error: 'Khoảng thời gian mặc định không hợp lệ' },
        { status: 400 }
      );
    }

    const clean = {
      id,
      name: String(payload.name || '').trim(),
      code: payload.code ? String(payload.code).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      category: payload.category ? (String(payload.category).trim() as EventCategory) : null,
      color: payload.color ? String(payload.color).trim() : null,
      isReminder: Boolean(payload.isReminder),
      defaultStatus: payload.defaultStatus ? (String(payload.defaultStatus).trim() as EventStatus) : EventStatus.Planned,
      defaultLeadTimeDays,
    };

    if (!clean.name) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng nhập tên loại sự kiện' },
        { status: 400 }
      );
    }

    const eventTypeService = new EventTypeService();
    await eventTypeService.update(clean);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update event type error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi cập nhật loại sự kiện' },
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

    const id = parseInt(params.id);
    const eventTypeService = new EventTypeService();
    const result = await eventTypeService.delete(id);

    return NextResponse.json({
      status: result,
      message: result ? 'Xóa thành công' : 'Không thể xóa loại sự kiện đang được sử dụng trong sự kiện'
    });
  } catch (error: any) {
    console.error('Delete event type error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi xóa loại sự kiện' },
      { status: 500 }
    );
  }
}




