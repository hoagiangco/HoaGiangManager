import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { EventService } from '@/lib/services/eventService';
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
    const { searchParams } = new URL(request.url);
    const planIdsParam = searchParams.get('planIds') || searchParams.get('planId');
    const planIdList = planIdsParam ? planIdsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!batchId) {
      return NextResponse.json(
        { status: false, error: 'BatchId là bắt buộc' },
        { status: 400 }
      );
    }

    // Get all events with the same maintenanceBatchId or planId
    const query = batchId === 'no-batch' && planIdList.length > 0
      ? `
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
          e."Metadata" as metadata,
          e."RelatedReportID" as "relatedReportId",
          e."Notes" as notes,
          e."CreatedAt" as "createdAt",
          e."UpdatedAt" as "updatedAt"
        FROM "Event" e
        LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
        LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
        LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
        WHERE (e."Metadata"->>'maintenancePlanId') = ANY($1::text[])
        ORDER BY COALESCE(e."EndDate", e."EventDate", e."StartDate") DESC, e."CreatedAt" DESC
      `
      : `
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
          e."Metadata" as metadata,
          e."RelatedReportID" as "relatedReportId",
          e."Notes" as notes,
          e."CreatedAt" as "createdAt",
          e."UpdatedAt" as "updatedAt"
        FROM "Event" e
        LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
        LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
        LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
        WHERE e."Metadata"::text LIKE $1
           OR (e."Metadata"->>'maintenancePlanId') = ANY($2::text[])
        ORDER BY COALESCE(e."EndDate", e."EventDate", e."StartDate") DESC, e."CreatedAt" DESC
      `;

    const queryParams = batchId === 'no-batch' && planIdList.length > 0
      ? [planIdList]
      : [`%${batchId}%`, planIdList.length > 0 ? planIdList : ['__none__']];

    const result = await pool.query(query, queryParams);

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

        if (!metadata) {
          return null;
        }

        // Filter by exact batchId match or planId match
        const matchesBatch = metadata.maintenanceBatchId === batchId;
        const matchesPlan = metadata.maintenancePlanId && planIdList.includes(String(metadata.maintenancePlanId));
        if (!matchesBatch && !matchesPlan) {
          return null;
        }

        return {
          id: row.id,
          title: row.title,
          deviceId: row.deviceId,
          deviceName: row.deviceName || row.title || 'Công việc định kỳ',
          eventTypeId: row.eventTypeId,
          eventTypeName: row.eventTypeName,
          description: row.description,
          status: row.status,
          eventDate: row.eventDate ? new Date(row.eventDate).toISOString().split('T')[0] : null,
          startDate: row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : null,
          endDate: row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : null,
          staffId: row.staffId,
          staffName: row.staffName,
          maintenanceBatchId: metadata.maintenanceBatchId,
          maintenanceType: metadata.maintenanceType || null,
          maintenanceProvider: metadata.maintenanceProvider || null,
          relatedReportId: row.relatedReportId || null,
          notes: row.notes || null,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        };
      })
      .filter((event: any) => event !== null);

    return NextResponse.json({
      status: true,
      data: events,
    });
  } catch (error: any) {
    console.error('Get batch events error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy danh sách event của batch',
      },
      { status: 500 }
    );
  }
}

