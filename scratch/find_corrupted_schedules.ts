import pool from '../lib/db/index';
import { calculateNextDueDate } from '../lib/utils/maintenanceScheduler';

async function findCorrupted() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        "ID", 
        "StartFrom", 
        "NextDueDate", 
        "IntervalValue", 
        "IntervalUnit", 
        "Metadata" 
      FROM "DeviceReminderPlan" 
      WHERE "IsActive" = true AND "StartFrom" IS NOT NULL AND "NextDueDate" IS NOT NULL
    `);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let corrupted = 0;
    
    for (const row of res.rows) {
      let metadata: any = {};
      try {
        metadata = typeof row.Metadata === 'string' ? JSON.parse(row.Metadata) : row.Metadata;
      } catch (e) {}

      // Calculate what the STRICT next date should be (first date > today in sequence)
      const strictNextDate = calculateNextDueDate(
        today, 
        row.IntervalValue, 
        row.IntervalUnit, 
        metadata?.scheduleConfig, 
        false, 
        new Date(row.StartFrom)
      );

      const actualNextDate = new Date(row.NextDueDate);
      actualNextDate.setHours(0, 0, 0, 0);

      // If the strict next date is BEFORE the actual next date, it means it double-bumped
      // Or if it just doesn't match the sequence
      if (strictNextDate.getTime() !== actualNextDate.getTime()) {
         // Check if it was manually rescheduled
         const reschedules = metadata?.rescheduleHistory || [];
         const isRescheduled = reschedules.some((r: any) => {
            const rescheduledDate = new Date(r.toDate);
            rescheduledDate.setHours(0, 0, 0, 0);
            return rescheduledDate.getTime() === actualNextDate.getTime();
         });

         if (!isRescheduled) {
            console.log(`Plan ID: ${row.ID}`);
            console.log(`  StartFrom: ${new Date(row.StartFrom).toISOString().split('T')[0]}`);
            console.log(`  Actual NextDueDate: ${actualNextDate.toISOString().split('T')[0]}`);
            console.log(`  Strict NextDueDate: ${strictNextDate.toISOString().split('T')[0]}`);
            console.log(`  Interval: ${row.IntervalValue} ${row.IntervalUnit}`);
            console.log('-------------------------------------------');
            corrupted++;
         }
      }
    }
    console.log(`Found ${corrupted} potentially corrupted plans out of ${res.rows.length}`);
  } finally {
    client.release();
  }
}

findCorrupted().then(() => process.exit(0));
