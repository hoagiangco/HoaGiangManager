import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventTypeService } from '@/lib/services/eventTypeService';

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

    const eventTypeData = await request.json();
    const eventTypeService = new EventTypeService();
    const id = await eventTypeService.create(eventTypeData);

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

