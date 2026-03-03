import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { EventStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate date range: from today to 7 days from now
    // Include overdue plans (nextDueDate < today) and plans due within 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999);

    // Get ALL plans (both active and inactive) with maintenanceBatchId in metadata
    const allPlansResult = await pool.query(
      `
      SELECT 
        drp."ID" as id,
        drp."Title" as title,
        drp."Metadata" as metadata,
        drp."IsActive" as "isActive",
        drp."NextDueDate" as "nextDueDate",
        drp."CreatedAt" as "createdAt"
      FROM "DeviceReminderPlan" drp
      WHERE drp."Metadata" IS NOT NULL
        AND drp."Metadata"::text LIKE '%maintenanceBatchId%'
      ORDER BY drp."CreatedAt" DESC
      `
    );

    // Get plans with nextDueDate within range (active and inactive)
    const plansResult = await pool.query(
      `
      SELECT 
        drp."ID" as id,
        drp."Title" as title,
        drp."Metadata" as metadata,
        drp."IsActive" as "isActive",
        drp."NextDueDate" as "nextDueDate",
        drp."CreatedAt" as "createdAt"
      FROM "DeviceReminderPlan" drp
      WHERE drp."Metadata" IS NOT NULL
        AND drp."Metadata"::text LIKE '%maintenanceBatchId%'
        AND drp."NextDueDate" IS NOT NULL
        AND drp."NextDueDate" <= $1::timestamp
      ORDER BY drp."CreatedAt" DESC
      `,
      [sevenDaysLater]
    );

    // Get all events with maintenanceBatchId in metadata for statistics
    const eventsResult = await pool.query(
      `
      SELECT 
        e."ID" as id,
        e."Title" as title,
        e."Status" as status,
        e."DeviceID" as "deviceId",
        e."EventDate" as "eventDate",
        e."EndDate" as "endDate",
        e."Metadata" as metadata
      FROM "Event" e
      WHERE e."Metadata" IS NOT NULL
        AND e."Metadata"::text LIKE '%maintenanceBatchId%'
      ORDER BY e."EventDate" DESC, e."CreatedAt" DESC
      `
    );

    // Group plans by maintenanceBatchId to get all batches
    const batchMap = new Map<string, any>();

    // Then, add event statistics to batches
    eventsResult.rows.forEach((row: any) => {
      let metadata: Record<string, any> | null = null;
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata);
          } catch (error) {
            return; // Skip invalid metadata
          }
        } else {
          metadata = row.metadata;
        }
      }

      if (!metadata || !metadata.maintenanceBatchId) {
        return; // Skip events without batchId
      }

      const batchId = metadata.maintenanceBatchId;

      // If batch doesn't exist in map, create it (shouldn't happen, but just in case)
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          title: row.title || metadata.title || 'Bảo trì định kỳ',
          totalDevices: 0,
          activePlansCount: 0,
          completed: 0,
          inProgress: 0,
          planned: 0,
          cancelled: 0,
          progressPercentage: 0,
          createdAt: null,
          nextDueDate: null,
          isCancelled: false,
        });
      }

      const batch = batchMap.get(batchId)!;

      const status = String(row.status).toLowerCase();
      if (status === EventStatus.Completed.toLowerCase()) {
        batch.completed += 1;
      } else if (status === EventStatus.InProgress.toLowerCase()) {
        batch.inProgress += 1;
      } else if (status === EventStatus.Planned.toLowerCase()) {
        batch.planned += 1;
      } else if (status === EventStatus.Cancelled.toLowerCase()) {
        batch.cancelled += 1;
      }
    });

    // Calculate common properties from ALL plans (not just those in date range)
    allPlansResult.rows.forEach((row: any) => {
      let metadata: Record<string, any> | null = null;
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata);
          } catch (error) {
            return;
          }
        } else {
          metadata = row.metadata;
        }
      }

      if (!metadata || !metadata.maintenanceBatchId) {
        return;
      }

      const batchId = metadata.maintenanceBatchId;

      // Initialize batch in map if not exists (from allPlans to catch all)
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          title: row.title || metadata.title || 'Bảo trì định kỳ',
          totalDevices: 0,
          activePlansCount: 0,
          completed: 0,
          inProgress: 0,
          planned: 0,
          cancelled: 0,
          progressPercentage: 0,
          createdAt: row.createdAt,
          nextDueDate: null,
          isCancelled: false,
          isCancelledBatch: false, // Initialize isCancelledBatch
        });
      }

      const batch = batchMap.get(batchId)!;
      batch.totalDevices += 1;
      // Robust check for boolean isActive from Postgres record
      const isActive = row.isActive === true || String(row.isActive) === 't' || row.isActive === 1 || String(row.isActive) === '1';
      if (isActive) {
        batch.activePlansCount += 1;
      }

      // Track the earliest nextDueDate for the entire batch
      const planNextDueDate = row.nextDueDate ? new Date(row.nextDueDate) : null;
      if (planNextDueDate) {
        if (!batch.nextDueDate || planNextDueDate < new Date(batch.nextDueDate)) {
          batch.nextDueDate = planNextDueDate.toISOString();
        }
      }
    });

    // Count plans within date range for filtering (to show only batches due soon)
    const plansInRangeMap = new Map<string, number>();
    plansResult.rows.forEach((row: any) => {
      let metadata: Record<string, any> | null = null;
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata);
          } catch (error) {
            return;
          }
        } else {
          metadata = row.metadata;
        }
      }

      if (!metadata || !metadata.maintenanceBatchId) {
        return;
      }

      const batchId = metadata.maintenanceBatchId;
      plansInRangeMap.set(batchId, (plansInRangeMap.get(batchId) || 0) + 1);
    });

    // Calculate progress percentage for each batch
    // Count unique devices that have been completed (not total events)
    const batches = Array.from(batchMap.values()).map((batch) => {
      const totalActive = batch.totalDevices - batch.cancelled;

      // Count unique devices that have completed events for this batch
      // This prevents counting multiple maintenance rounds as > 100%
      const uniqueCompletedDevices = new Set<number>();
      eventsResult.rows.forEach((row: any) => {
        let metadata: Record<string, any> | null = null;
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            try {
              metadata = JSON.parse(row.metadata);
            } catch (error) {
              return;
            }
          } else {
            metadata = row.metadata;
          }
        }

        if (metadata?.maintenanceBatchId === batch.batchId &&
          String(row.status).toLowerCase() === EventStatus.Completed.toLowerCase()) {
          // Only count events with deviceId (maintenance events should have deviceId)
          const eventDeviceId = row.deviceId;
          if (eventDeviceId && typeof eventDeviceId === 'number') {
            uniqueCompletedDevices.add(eventDeviceId);
          }
        }
      });

      // Use unique completed devices count, capped at totalActive
      const completedCount = Math.min(uniqueCompletedDevices.size, totalActive);

      // Calculate percentage: completed devices / total active devices
      batch.progressPercentage =
        totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0;

      // Ensure percentage is between 0 and 100
      if (batch.progressPercentage < 0) {
        batch.progressPercentage = 0;
      } else if (batch.progressPercentage > 100) {
        batch.progressPercentage = 100;
      }

      batch.isCancelled = (batch.activePlansCount || 0) === 0;

      return batch;
    });

    // Check for 'all' parameter to skip date filtering
    const showAll = request.nextUrl.searchParams.get('all') === 'true';

    // Filter batches: if not showing all, only keep batches that have at least one active plan within date range
    const finalResult = showAll
      ? batches
      : batches.filter((batch) => {
        return plansInRangeMap.has(batch.batchId) && plansInRangeMap.get(batch.batchId)! > 0;
      });

    // Sort by most recent creation date or event date
    finalResult.sort((a, b) => {
      // Get the most recent event date for each batch
      const aEvents = eventsResult.rows.filter((row: any) => {
        try {
          const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          return metadata?.maintenanceBatchId === a.batchId;
        } catch {
          return false;
        }
      });
      const bEvents = eventsResult.rows.filter((row: any) => {
        try {
          const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          return metadata?.maintenanceBatchId === b.batchId;
        } catch {
          return false;
        }
      });

      const aEventDate = aEvents[0]?.eventDate || aEvents[0]?.createdAt || null;
      const bEventDate = bEvents[0]?.eventDate || bEvents[0]?.createdAt || null;

      // If both have event dates, sort by event date
      if (aEventDate && bEventDate) {
        return new Date(bEventDate).getTime() - new Date(aEventDate).getTime();
      }

      // Otherwise, sort by creation date
      const aDate = aEventDate || a.createdAt || new Date(0);
      const bDate = bEventDate || b.createdAt || new Date(0);
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    return NextResponse.json({
      status: true,
      data: finalResult,
    });
  } catch (error: any) {
    console.error('Get maintenance batches error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy danh sách batch bảo trì',
      },
      { status: 500 }
    );
  }
}

