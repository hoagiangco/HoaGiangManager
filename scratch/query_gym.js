const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const r = await pool.query(`
    SELECT p."ID", p."Title", p."NextDueDate", p."IntervalValue", p."IntervalUnit", 
           p."StartFrom", p."Metadata"::text as metadata
    FROM "DeviceReminderPlan" p 
    WHERE p."Title" ILIKE '%GYM%' OR p."Title" ILIKE '%Hut tham%' OR p."Title" ILIKE '%thảm%'
    LIMIT 10
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
