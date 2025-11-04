import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventService } from '@/lib/services/eventService';

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

    const eventData = await request.json();
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

