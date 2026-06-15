process.env.TZ = 'Asia/Ho_Chi_Minh';
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const r = await pool.query(`
    UPDATE "DeviceReminderPlan"
    SET "NextDueDate" = '2026-07-05T00:00:00+07:00'
    WHERE "ID" = 144
    RETURNING "ID", "Title", "NextDueDate"
  `);
  
  console.log('Fixed elevator plan 144:');
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
