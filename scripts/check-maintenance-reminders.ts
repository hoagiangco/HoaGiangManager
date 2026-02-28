/**
 * Scheduled Job: Check Maintenance Reminders
 * 
 * This script checks for DeviceReminderPlan records that are due today,
 * creates Event records for them, and updates the nextDueDate.
 * 
 * Run manually: npm run check-reminders
 * Schedule with cron: 0 9 * * * (9 AM daily)
 */

import pool from '../lib/db';
import { EventStatus } from '../types';

type IntervalUnit = 'day' | 'week' | 'month' | 'year';

const calculateNextDueDate = (
  currentDueDate: Date,
  intervalValue: number,
  intervalUnit: IntervalUnit
): Date => {
  const nextDate = new Date(currentDueDate);
  
  switch (intervalUnit) {
    case 'day':
      nextDate.setDate(nextDate.getDate() + intervalValue);
      break;
    case 'week':
      nextDate.setDate(nextDate.getDate() + intervalValue * 7);
      break;
    case 'month':
      nextDate.setMonth(nextDate.getMonth() + intervalValue);
      break;
    case 'year':
      nextDate.setFullYear(nextDate.getFullYear() + intervalValue);
      break;
  }
  
  return nextDate;
};

async function checkMaintenanceReminders() {
  const client = await pool.connect();
  
  try {
    console.log('=== Bắt đầu kiểm tra kế hoạch bảo trì ===');
    console.log(`Thời gian: ${new Date().toISOString()}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active reminder plans due today
    const result = await client.query(
      `
      SELECT 
        p."ID" as id,
        p."DeviceID" as "deviceId",
        p."EventTypeID" as "eventTypeId",
        p."Title" as title,
        p."Description" as description,
        p."IntervalValue" as "intervalValue",
        p."IntervalUnit" as "intervalUnit",
        p."NextDueDate" as "nextDueDate",
        p."EndAt" as "endAt",
        p."Metadata" as metadata,
        p."CreatedBy" as "createdBy"
      FROM "DeviceReminderPlan" p
      WHERE p."IsActive" = true
        AND p."NextDueDate" IS NOT NULL
        AND p."NextDueDate" >= $1
        AND p."NextDueDate" < $2
      ORDER BY p."NextDueDate" ASC
      `,
      [today, tomorrow]
    );

    const duePlans = result.rows;
    console.log(`Tìm thấy ${duePlans.length} kế hoạch đến hạn hôm nay`);

    if (duePlans.length === 0) {
      console.log('Không có kế hoạch nào đến hạn. Kết thúc.');
      return;
    }

    let createdEvents = 0;
    let updatedPlans = 0;
    let errors = 0;

    // Process each plan
    for (const row of duePlans) {
      try {
        await client.query('BEGIN');

        // Parse metadata
        let metadata: Record<string, any> | null = null;
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            try {
              metadata = JSON.parse(row.metadata);
            } catch (error) {
              console.warn(`Lỗi parse metadata cho plan ${row.id}:`, error);
              metadata = null;
            }
          } else {
            metadata = row.metadata;
          }
        }

        const nextDueDate = new Date(row.nextDueDate);
        const endAt = row.endAt ? new Date(row.endAt) : null;

        // Check if plan has ended
        if (endAt && endAt < today) {
          console.log(`Plan ${row.id} đã hết hạn (endAt: ${endAt.toISOString()})`);
          await client.query('UPDATE "DeviceReminderPlan" SET "IsActive" = false WHERE "ID" = $1', [row.id]);
          await client.query('COMMIT');
          continue;
        }

        // Ensure Event sequence is correct
        const maxRes = await client.query('SELECT COALESCE(MAX("ID"), 0) AS max_id FROM "Event"');
        const seqRes = await client.query('SELECT last_value, is_called FROM "Event_ID_seq"');
        const maxId = Number(maxRes.rows[0]?.max_id || 0);
        let seqValue = Number(seqRes.rows[0]?.last_value || 0);
        const isCalled = seqRes.rows[0]?.is_called ?? false;
        if (!isCalled) seqValue -= 1;
        if (maxId > seqValue) {
          await client.query('SELECT setval(pg_get_serial_sequence(\'"Event"\', \'ID\'), $1, true)', [maxId]);
        }

        // Create Event for this device using client transaction
        const eventMetadata = {
          ...metadata,
          maintenanceBatchId: metadata?.maintenanceBatchId || null,
        };

        const now = new Date();
        const eventResult = await client.query(
          `INSERT INTO "Event" (
            "Title", "DeviceID", "EventTypeID", "Description", "Notes",
            "Status", "EventDate", "StartDate", "EndDate", "StaffID",
            "RelatedReportID", "Metadata", "CreatedBy", "CreatedAt",
            "UpdatedBy", "UpdatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING "ID"`,
          [
            row.title || `Bảo trì định kỳ - ${nextDueDate.toISOString().split('T')[0]}`,
            row.deviceId,
            row.eventTypeId,
            row.description || null,
            null, // Notes field is not used
            EventStatus.Planned,
            nextDueDate,
            nextDueDate,
            null,
            null,
            null,
            eventMetadata ? JSON.stringify(eventMetadata) : null,
            row.createdBy || 'system',
            now,
            row.createdBy || 'system',
            now,
          ]
        );

        const eventId = eventResult.rows[0].ID;
        console.log(`Đã tạo Event ${eventId} cho Device ${row.deviceId}`);

        // Calculate next due date
        const newNextDueDate = calculateNextDueDate(
          nextDueDate,
          row.intervalValue,
          row.intervalUnit
        );

        // Check if new nextDueDate exceeds endAt
        if (endAt && newNextDueDate > endAt) {
          // Plan has ended, deactivate it
          await client.query(
            `UPDATE "DeviceReminderPlan" 
             SET "NextDueDate" = NULL,
                 "LastTriggeredAt" = $1,
                 "IsActive" = false,
                 "UpdatedAt" = CURRENT_TIMESTAMP
             WHERE "ID" = $2`,
            [today, row.id]
          );
          console.log(`Plan ${row.id} đã kết thúc sau khi tính toán nextDueDate mới`);
        } else {
          // Update plan with new nextDueDate
          await client.query(
            `UPDATE "DeviceReminderPlan" 
             SET "NextDueDate" = $1,
                 "LastTriggeredAt" = $2,
                 "UpdatedAt" = CURRENT_TIMESTAMP
             WHERE "ID" = $3`,
            [newNextDueDate, today, row.id]
          );
          console.log(`Đã cập nhật Plan ${row.id} với nextDueDate mới: ${newNextDueDate.toISOString().split('T')[0]}`);
        }

        await client.query('COMMIT');
        createdEvents++;
        updatedPlans++;

      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Lỗi xử lý plan ${row.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Kết quả ===');
    console.log(`- Đã tạo ${createdEvents} Event`);
    console.log(`- Đã cập nhật ${updatedPlans} Plan`);
    console.log(`- Lỗi: ${errors}`);
    console.log('=== Hoàn thành ===\n');

  } catch (error: any) {
    console.error('Lỗi khi kiểm tra kế hoạch bảo trì:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
checkMaintenanceReminders()
  .then(() => {
    console.log('Script hoàn thành thành công');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script thất bại:', error);
    process.exit(1);
  });

