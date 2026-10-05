/** Generate scheduled occurrences without using report/completion dates as calendar anchors. */
import pool from '../lib/db';
import { calculateNextDueDay, maintenanceDay, maintenanceToday, IntervalUnit } from '../lib/utils/maintenanceScheduler';

export async function checkMaintenanceReminders() {
  const client = await pool.connect();
  const today = maintenanceToday();
  try {
    // IDs only: re-read and lock each plan in its transaction, after any competing writer commits.
    const due = await client.query(`SELECT "ID" FROM "DeviceReminderPlan"
      WHERE "IsActive" = true AND "NextDueDate"::date <= $1::date ORDER BY "ID"`, [today]);
    let failures = 0;
    for (const candidate of due.rows) {
      try {
        await client.query('BEGIN');
        const locked = await client.query(`SELECT *, "StartFrom"::date::text AS anchor_day,
          "NextDueDate"::date::text AS due_day, "EndAt"::date::text AS end_day
          FROM "DeviceReminderPlan" WHERE "ID" = $1 FOR UPDATE`, [candidate.ID]);
        const plan = locked.rows[0];
        if (!plan?.IsActive || !plan.due_day || plan.due_day > today) {
          await client.query('COMMIT');
          continue;
        }
        if (!plan.IntervalValue || !plan.IntervalUnit) throw new Error('Recurring interval is required');
        const metadata = typeof plan.Metadata === 'string' ? JSON.parse(plan.Metadata) : plan.Metadata || {};
        const anchor = plan.anchor_day || plan.due_day;
        let next: string | null = plan.due_day;
        // Process missed occurrences too; a bounded backlog is continued on the next run.
        for (let count = 0; next && next <= today && count < 366; count++) {
          if (plan.end_day && next > plan.end_day) { next = null; break; }
          const existing = await client.query(`SELECT "ID" FROM "Event"
            WHERE "DeviceID" = $1 AND (
              ("Metadata"->>'maintenancePlanId' = $2 AND "Metadata"->>'scheduledDueDate' = $3)
              OR ("Metadata"->>'maintenanceBatchId' = $4 AND "EventDate"::date = $3::date)
            ) LIMIT 1`, [plan.DeviceID, String(plan.ID), next, metadata.maintenanceBatchId || null]);
          if (!existing.rows.length) {
            await client.query(`INSERT INTO "Event" (
              "Title", "DeviceID", "EventTypeID", "Description", "Notes", "Status", "EventDate",
              "Metadata", "CreatedBy", "CreatedAt", "UpdatedBy", "UpdatedAt")
              VALUES ($1,$2,$3,$4,'','planned',$5::date,$6::jsonb,$7,CURRENT_TIMESTAMP,$7,CURRENT_TIMESTAMP)`, [
              plan.Title || `Maintenance - ${next}`, plan.DeviceID, plan.EventTypeID, plan.Description || '', next,
              JSON.stringify({ ...metadata, maintenancePlanId: plan.ID, scheduledDueDate: next }),
              plan.CreatedBy || 'system',
            ]);
          }
          next = calculateNextDueDay(next, plan.IntervalValue, plan.IntervalUnit as IntervalUnit,
            metadata.scheduleConfig, false, anchor);
          if (plan.end_day && next > plan.end_day) next = null;
        }
        await client.query(`UPDATE "DeviceReminderPlan" SET "NextDueDate"=$1::date,
          "IsActive"=($1::date IS NOT NULL), "LastTriggeredAt"=CURRENT_TIMESTAMP,
          "UpdatedAt"=CURRENT_TIMESTAMP WHERE "ID"=$2`, [next, plan.ID]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        failures++;
        console.error(`Maintenance plan ${candidate.ID} failed:`, error);
      }
    }
    if (failures) throw new Error(`${failures} maintenance plans failed`);
  } finally { client.release(); }
}

if (require.main === module) {
  checkMaintenanceReminders().then(() => pool.end()).catch(async error => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
}
