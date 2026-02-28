import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { batchId } = params;

    if (!batchId) {
      return NextResponse.json(
        { status: false, error: 'BatchId là bắt buộc' },
        { status: 400 }
      );
    }

    // Get all completed events with the same maintenanceBatchId, grouped by round date
    const result = await pool.query(
      `
      SELECT 
        e."ID" as id,
        e."Title" as title,
        e."DeviceID" as "deviceId",
        d."Name" as "deviceName",
        e."EventTypeID" as "eventTypeId",
        et."Name" as "eventTypeName",
        e."Description" as description,
        e."Status" as status,
        e."EventDate" as "eventDate",
        e."StartDate" as "startDate",
        e."EndDate" as "endDate",
        e."StaffID" as "staffId",
        s."Name" as "staffName",
        e."RelatedReportID" as "relatedReportId",
        e."Notes" as notes,
        e."Metadata" as metadata,
        e."CreatedAt" as "createdAt",
        e."UpdatedAt" as "updatedAt"
      FROM "Event" e
      LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
      LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
      LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
      WHERE e."Metadata"::text LIKE $1
        AND e."Status" = 'completed'
      ORDER BY COALESCE(e."EndDate", e."EventDate", e."StartDate") DESC, e."CreatedAt" DESC
      `,
      [`%${batchId}%`]
    );

    const events = result.rows
      .map((row: any) => {
        let metadata: Record<string, any> | null = null;
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            try {
              metadata = JSON.parse(row.metadata);
            } catch (error) {
              metadata = null;
            }
          } else {
            metadata = row.metadata;
          }
        }

        // Filter by exact batchId match
        if (!metadata || metadata.maintenanceBatchId !== batchId) {
          return null;
        }

        // Determine round date (use endDate if available, otherwise eventDate, otherwise startDate)
        const roundDate = row.endDate || row.eventDate || row.startDate;
        const roundDateStr = roundDate ? new Date(roundDate).toISOString().split('T')[0] : null;

        return {
          id: row.id,
          title: row.title,
          deviceId: row.deviceId,
          deviceName: row.deviceName,
          eventTypeId: row.eventTypeId,
          eventTypeName: row.eventTypeName,
          description: row.description,
          status: row.status,
          eventDate: row.eventDate ? new Date(row.eventDate).toISOString().split('T')[0] : null,
          startDate: row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : null,
          endDate: row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : null,
          roundDate: roundDateStr,
          staffId: row.staffId,
          staffName: row.staffName,
          relatedReportId: row.relatedReportId,
          notes: row.notes,
          maintenanceBatchId: metadata.maintenanceBatchId,
          maintenanceType: metadata.maintenanceType || null,
          maintenanceProvider: metadata.maintenanceProvider || null,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        };
      })
      .filter((event: any) => event !== null);

    // Group events by roundDate
    const roundsMap: Record<string, any[]> = {};
    events.forEach((event: any) => {
      const roundDate = event.roundDate;
      if (roundDate) {
        if (!roundsMap[roundDate]) {
          roundsMap[roundDate] = [];
        }
        roundsMap[roundDate].push(event);
      }
    });

    // Convert to array of rounds
    const rounds = Object.keys(roundsMap)
      .sort((a, b) => b.localeCompare(a)) // Sort descending (newest first)
      .map((roundDate) => {
        const roundEvents = roundsMap[roundDate];
        const firstEvent = roundEvents[0];
        
        return {
          roundDate,
          batchId,
          title: firstEvent.maintenanceBatchId ? `Đợt bảo trì ${roundDate}` : 'Đợt bảo trì',
          maintenanceType: firstEvent.maintenanceType,
          maintenanceProvider: firstEvent.maintenanceProvider,
          totalDevices: roundEvents.length,
          completedDevices: roundEvents.filter((e: any) => e.status === 'completed').length,
          events: roundEvents,
        };
      });

    return NextResponse.json({
      status: true,
      data: rounds,
    });
  } catch (error: any) {
    console.error('Get maintenance rounds error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy danh sách đợt bảo trì',
      },
      { status: 500 }
    );
  }
}


