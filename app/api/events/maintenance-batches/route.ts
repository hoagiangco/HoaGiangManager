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

    // Get ALL plans with maintenanceBatchId in metadata (for totalDevices count)
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
        AND drp."IsActive" = true
      ORDER BY drp."CreatedAt" DESC
      `
    );

    // Get plans with nextDueDate <= 7 days from now (for filtering batches to show)
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
        AND drp."IsActive" = true
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

    // First, add all batches from plans
    plansResult.rows.forEach((row: any) => {
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
        return; // Skip plans without batchId
      }

      const batchId = metadata.maintenanceBatchId;
      
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          title: row.title || metadata.title || 'Bảo trì định kỳ',
          totalDevices: 0,
          completed: 0,
          inProgress: 0,
          planned: 0,
          cancelled: 0,
          progressPercentage: 0,
          createdAt: row.createdAt,
        });
      }
    });

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
          completed: 0,
          inProgress: 0,
          planned: 0,
          cancelled: 0,
          progressPercentage: 0,
          createdAt: null,
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

    // Count unique plans per batch for totalDevices (ALL active plans, not just within date range)
    const planCountMap = new Map<string, number>();
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
      planCountMap.set(batchId, (planCountMap.get(batchId) || 0) + 1);
    });

    // Update totalDevices from plan counts (ALL plans in batch)
    planCountMap.forEach((count, batchId) => {
      const batch = batchMap.get(batchId);
      if (batch) {
        batch.totalDevices = count;
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
      
      return batch;
    });

    // Filter batches: only keep batches that have at least one active plan within date range
    const filteredBatches = batches.filter((batch) => {
      return plansInRangeMap.has(batch.batchId) && plansInRangeMap.get(batch.batchId)! > 0;
    });

    // Sort by most recent creation date or event date
    filteredBatches.sort((a, b) => {
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
      data: filteredBatches,
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

