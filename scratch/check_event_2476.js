process.env.TZ = 'Asia/Ho_Chi_Minh';
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Xem chi tiết event 2476 (5/6) - event mới nhất
  const r = await pool.query(`
    SELECT e."ID", e."Title", e."EventDate", e."StartDate", e."EndDate", e."Status", 
           e."CreatedAt", e."UpdatedAt", e."Metadata"::text as metadata
    FROM "Event" e
    WHERE e."ID" = 2476
  `);
  console.log('Event 2476 (5/6):');
  console.log(JSON.stringify(r.rows[0], null, 2));
  
  // Xem raw NextDueDate trong DB
  const plan = await pool.query(`SELECT p."NextDueDate", p."LastTriggeredAt" FROM "DeviceReminderPlan" p WHERE p."ID" = 144`);
  console.log('\nPlan raw dates:');
  console.log('NextDueDate UTC:', plan.rows[0].NextDueDate);
  console.log('NextDueDate VN:', new Date(plan.rows[0].NextDueDate).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}));
  console.log('LastTriggeredAt UTC:', plan.rows[0].LastTriggeredAt);
  console.log('LastTriggeredAt VN:', plan.rows[0].LastTriggeredAt ? new Date(plan.rows[0].LastTriggeredAt).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : 'null');

  await pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
