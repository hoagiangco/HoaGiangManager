process.env.TZ = 'Asia/Ho_Chi_Minh';
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const r = await pool.query(`
    SELECT p."ID", p."Title", p."NextDueDate", p."IntervalValue", p."IntervalUnit", 
           p."StartFrom", p."LastTriggeredAt", p."Metadata"::text as metadata, p."IsActive"
    FROM "DeviceReminderPlan" p 
    WHERE (p."Title" ILIKE '%thang máy%' OR p."Title" ILIKE '%thang may%' OR p."Title" ILIKE '%Hoa đăng%' OR p."Title" ILIKE '%Hoa dang%')
      AND p."IsActive" = true
    ORDER BY p."NextDueDate"
    LIMIT 20
  `);
  r.rows.forEach(row => {
    const meta = JSON.parse(row.metadata || '{}');
    console.log(`ID=${row.ID} | ${row.Title}`);
    console.log(`  StartFrom:       ${row.StartFrom ? new Date(row.StartFrom).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : 'null'}`);
    console.log(`  NextDueDate:     ${row.NextDueDate ? new Date(row.NextDueDate).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : 'null'}`);
    console.log(`  LastTriggeredAt: ${row.LastTriggeredAt ? new Date(row.LastTriggeredAt).toLocaleDateString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : 'null'}`);
    console.log(`  Interval:        ${row.IntervalValue} ${row.IntervalUnit}`);
    console.log(`  ScheduleType:    ${meta.scheduleConfig?.scheduleType || 'interval (none)'}`);
    console.log('');
  });
  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
