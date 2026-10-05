import pool from '../db';
import type { PoolClient } from 'pg';
import { advanceScheduledDueDay, maintenanceDay, maintenanceToday } from '../utils/maintenanceScheduler';

/** Row locks serialize cron/report/event advancement; future or explicitly deferred dates are preserved. */
export async function advanceMaintenanceSchedule(
  scope: { batchId?: string | null; deviceId?: number | null; planId?: number | null },
  transaction?: PoolClient,
): Promise<void> {
  if (!scope.batchId && !scope.planId) return;
  const client = transaction || await pool.connect();
  try {
    if (!transaction) await client.query('BEGIN');
    const result = await client.query(
      `SELECT "ID", "StartFrom"::date::text AS "startFrom", "EndAt"::date::text AS "endAt",
              "NextDueDate"::date::text AS "nextDueDate", "IntervalValue" AS "intervalValue",
              "IntervalUnit" AS "intervalUnit", "Metadata" AS metadata
       FROM "DeviceReminderPlan"
       WHERE "IsActive" = true
         AND ($1::text IS NULL OR "Metadata"->>'maintenanceBatchId' = $1)
         AND ($2::integer IS NULL OR "DeviceID" = $2)
         AND ($3::integer IS NULL OR "ID" = $3)
       ORDER BY "ID" FOR UPDATE`,
      [scope.batchId || null, scope.deviceId || null, scope.planId || null],
    );
    const today = maintenanceToday();
    for (const plan of result.rows) {
      if (!plan.nextDueDate || !plan.intervalValue || !plan.intervalUnit) continue;
      const next = advanceScheduledDueDay(plan, today);
      if (next === maintenanceDay(plan.nextDueDate)) continue;
      await client.query(
        `UPDATE "DeviceReminderPlan" SET "NextDueDate" = $1::date,
           "IsActive" = CASE WHEN $1::date IS NULL THEN false ELSE "IsActive" END,
           "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $2`,
        [next, plan.ID],
      );
    }
    if (!transaction) await client.query('COMMIT');
  } catch (error) {
    if (!transaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    if (!transaction) client.release();
  }
}
