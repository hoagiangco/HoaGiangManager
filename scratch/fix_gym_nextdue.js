process.env.TZ = 'Asia/Ho_Chi_Minh';

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Verify current state first
  const before = await pool.query(`
    SELECT p."ID", p."Title", p."NextDueDate", p."IntervalValue", p."IntervalUnit"
    FROM "DeviceReminderPlan" p 
    WHERE p."ID" = 140
  `);
  console.log('BEFORE:', JSON.stringify(before.rows, null, 2));

  // The plan is weekly on Wednesday (day=3), last was 10/6/2026 (Wed)
  // Next should be 17/6/2026 (Wed) = 2026-06-16T17:00:00.000Z in UTC
  const newNextDueDate = new Date('2026-06-17T00:00:00+07:00');
  console.log('Setting nextDueDate to:', newNextDueDate.toISOString(), '=', newNextDueDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));

  const result = await pool.query(`
    UPDATE "DeviceReminderPlan"
    SET "NextDueDate" = $1, "UpdatedAt" = CURRENT_TIMESTAMP
    WHERE "ID" = 140
  `, [newNextDueDate]);
  console.log('Updated rows:', result.rowCount);

  // Verify after
  const after = await pool.query(`
    SELECT p."ID", p."Title", p."NextDueDate", p."IntervalValue", p."IntervalUnit"
    FROM "DeviceReminderPlan" p 
    WHERE p."ID" = 140
  `);
  console.log('AFTER:', JSON.stringify(after.rows, null, 2));

  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
