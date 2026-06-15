process.env.TZ = 'Asia/Ho_Chi_Minh';
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Xem lịch sử events của plan 144 (BT thang máy Hoa đăng)
  const meta = await pool.query(`SELECT p."Metadata"::text as metadata, p."NextDueDate", p."StartFrom", p."LastTriggeredAt" FROM "DeviceReminderPlan" p WHERE p."ID" = 144`);
  const m = JSON.parse(meta.rows[0].metadata || '{}');
  console.log('=== Plan 144 metadata ===');
  console.log('batchId:', m.maintenanceBatchId);
  console.log('scheduleConfig:', JSON.stringify(m.scheduleConfig));
  console.log('StartFrom:', new Date(meta.rows[0].StartFrom).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}));
  console.log('NextDueDate:', new Date(meta.rows[0].NextDueDate).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}));
  console.log('LastTriggeredAt:', meta.rows[0].LastTriggeredAt ? new Date(meta.rows[0].LastTriggeredAt).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : 'null');
  console.log('');

  const batchId = m.maintenanceBatchId;
  if (batchId) {
    const events = await pool.query(`
      SELECT e."ID", e."Title", e."EventDate", e."StartDate", e."EndDate", e."Status", e."CreatedAt"
      FROM "Event" e
      WHERE e."Metadata"::text LIKE $1
      ORDER BY e."EventDate" ASC
    `, [`%${batchId}%`]);
    console.log('=== Events ===');
    events.rows.forEach(e => {
      console.log(`  ID=${e.ID} | ${e.EventDate ? new Date(e.EventDate).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : 'null'} | ${e.Status}`);
    });
  }
  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
