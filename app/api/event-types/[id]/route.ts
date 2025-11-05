import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventTypeService } from '@/lib/services/eventTypeService';

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
    const eventTypeData = await request.json();
    const eventTypeService = new EventTypeService();
    await eventTypeService.update({ ...eventTypeData, id });

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




