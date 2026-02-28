import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string; roundDate: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { batchId, roundDate } = params;

    if (!batchId || !roundDate) {
      return NextResponse.json(
        { status: false, error: 'BatchId và RoundDate là bắt buộc' },
        { status: 400 }
      );
    }

    // Parse roundDate - ensure it's in YYYY-MM-DD format
    // If already in YYYY-MM-DD format, use it directly
    let roundDateFormatted = roundDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(roundDate)) {
      // If not in YYYY-MM-DD format, try to parse and format
      try {
        const roundDateObj = new Date(roundDate);
        if (isNaN(roundDateObj.getTime())) {
          return NextResponse.json(
            { status: false, error: 'RoundDate không hợp lệ' },
            { status: 400 }
          );
        }
        // Format as YYYY-MM-DD (use local date, not UTC)
        const year = roundDateObj.getFullYear();
        const month = String(roundDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(roundDateObj.getDate()).padStart(2, '0');
        roundDateFormatted = `${year}-${month}-${day}`;
      } catch (error) {
        return NextResponse.json(
          { status: false, error: 'RoundDate không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Get all events for this batch and round date
    // Use COALESCE to get the round date (endDate > eventDate > startDate)
    console.log('Querying events for batch:', batchId, 'roundDate:', roundDateFormatted);
    
    // Get all events with this batchId first, then filter by roundDate in JavaScript
    // This matches the exact logic used in the list API
    const allEventsResult = await pool.query(
      `
      SELECT 
        e."ID" as id,
        e."Title" as title,
        e."DeviceID" as "deviceId",
        d."Name" as "deviceName",
        d."Serial" as "deviceSerial",
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
      ORDER BY d."Name", e."ID"
      `,
      [`%${batchId}%`]
    );
    
    console.log('All completed events with batchId:', allEventsResult.rows.length);
    
    // Filter events by roundDate using the same logic as list API
    // roundDate = endDate || eventDate || startDate, then format as YYYY-MM-DD
    const filteredEvents = allEventsResult.rows.filter((row: any) => {
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
        return false;
      }

      // Calculate roundDate using same logic as list API
      const roundDate = row.endDate || row.eventDate || row.startDate;
      const roundDateStr = roundDate ? new Date(roundDate).toISOString().split('T')[0] : null;
      
      return roundDateStr === roundDateFormatted;
    });
    
    console.log('Filtered events by roundDate:', filteredEvents.length);
    
    // Convert to result format
    const result = {
      rows: filteredEvents
    };

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
          console.log('Event filtered out - metadata mismatch:', {
            eventId: row.id,
            metadataBatchId: metadata?.maintenanceBatchId,
            expectedBatchId: batchId
          });
          return null;
        }

        return {
          id: row.id,
          title: row.title,
          deviceId: row.deviceId,
          deviceName: row.deviceName,
          deviceSerial: row.deviceSerial,
          eventTypeId: row.eventTypeId,
          eventTypeName: row.eventTypeName,
          description: row.description,
          status: row.status,
          eventDate: row.eventDate ? new Date(row.eventDate).toISOString().split('T')[0] : null,
          startDate: row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : null,
          endDate: row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : null,
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

    // Get batch info from first event or from plans
    const batchInfo = events.length > 0 ? {
      batchId,
      title: events[0].title || `Bảo trì - ${roundDate}`,
      maintenanceType: events[0].maintenanceType,
      maintenanceProvider: events[0].maintenanceProvider,
    } : {
      batchId,
      title: `Bảo trì - ${roundDate}`,
      maintenanceType: null,
      maintenanceProvider: null,
    };

    // Get related damage reports
    // 1. From events (relatedReportId)
    const reportIds = events
      .map((e: any) => e.relatedReportId)
      .filter((id: any) => id !== null && id !== undefined);

    // 2. From maintenanceBatchId (all reports for this batch and round date)
    const roundDateObj = new Date(roundDate);
    roundDateObj.setHours(0, 0, 0, 0);
    const nextDay = new Date(roundDateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    let damageReports: any[] = [];
    
    // Query damage reports by maintenanceBatchId and completedDate matching roundDate
    const reportsResult = await pool.query(
      `
      SELECT 
        dr."ID" as id,
        dr."DamageContent" as "damageContent",
        dr."Status" as status,
        dr."ReportDate" as "reportDate",
        dr."CompletedDate" as "completedDate",
        reporter."Name" as "reporterName",
        handler."Name" as "handlerName"
      FROM "DamageReport" dr
      LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
      LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
      WHERE (
        dr."MaintenanceBatchId" = $1
        AND dr."CompletedDate" IS NOT NULL
        AND DATE(dr."CompletedDate") = $2::date
      )
      OR (
        dr."ID" = ANY($3::int[])
      )
      `,
      [batchId, roundDate, reportIds.length > 0 ? reportIds : [0]]
    );

    damageReports = reportsResult.rows.map((row: any) => ({
      id: row.id,
      damageContent: row.damageContent,
      status: parseInt(row.status),
      reportDate: row.reportDate ? new Date(row.reportDate).toISOString().split('T')[0] : null,
      completedDate: row.completedDate ? new Date(row.completedDate).toISOString().split('T')[0] : null,
      reporterName: row.reporterName,
      handlerName: row.handlerName,
    }));

    // Remove duplicates (in case a report is both linked via event and has maintenanceBatchId)
    const uniqueReports = damageReports.filter((report, index, self) =>
      index === self.findIndex((r) => r.id === report.id)
    );
    damageReports = uniqueReports;

    const roundData = {
      roundDate,
      batchInfo,
      totalDevices: events.length,
      completedDevices: events.filter((e: any) => e.status === 'completed').length,
      events,
      damageReports,
    };

    return NextResponse.json({
      status: true,
      data: roundData,
    });
  } catch (error: any) {
    console.error('Get maintenance round detail error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy chi tiết đợt bảo trì',
      },
      { status: 500 }
    );
  }
}

