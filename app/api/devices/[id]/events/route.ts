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

    const deviceId = parseInt(params.id, 10);

    if (isNaN(deviceId) || deviceId <= 0) {
      return NextResponse.json(
        { status: false, error: 'Device ID không hợp lệ' },
        { status: 400 }
      );
    }

    const eventService = new EventService();
    const allEvents = await eventService.getEventByType(0); // Get all events

    // Filter events for this device
    const deviceEvents = allEvents
      .filter((event) => event.deviceId === deviceId)
      .map((event) => {
        let maintenanceBatchId = null;
        if (event.metadata && typeof event.metadata === 'object') {
          maintenanceBatchId = event.metadata.maintenanceBatchId || null;
        }

        return {
          id: event.id,
          title: event.title,
          eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split('T')[0] : null,
          endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : null,
          status: event.status,
          eventTypeName: event.eventTypeName,
          description: event.description,
          maintenanceBatchId,
          maintenanceType: event.metadata?.maintenanceType || null,
          maintenanceProvider: event.metadata?.maintenanceProvider || null,
          createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
        };
      });

    return NextResponse.json({
      status: true,
      data: deviceEvents,
    });
  } catch (error: any) {
    console.error('Get device events error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy lịch sử event của thiết bị',
      },
      { status: 500 }
    );
  }
}

