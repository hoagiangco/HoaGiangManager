import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventService } from '@/lib/services/eventService';

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
    const eventData = await request.json();
    console.log(`Updating event ${id} with data:`, eventData);
    
    const eventService = new EventService();
    await eventService.update({ ...eventData, id });

    console.log(`Event ${id} updated successfully`);

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




