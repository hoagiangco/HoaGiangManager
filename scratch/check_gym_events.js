process.env.TZ = 'Asia/Ho_Chi_Minh';

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Find events linked to this batch
  const batchId = 'batch-2026-04-22-1776832499489';
  const r = await pool.query(`
    SELECT e."ID", e."Title", e."EventDate", e."Status", e."DeviceID"
    FROM "Event" e
    WHERE e."Metadata"::text LIKE $1
    ORDER BY e."EventDate" DESC
    LIMIT 10
  `, [`%${batchId}%`]);
  console.log('Events for batch:', JSON.stringify(r.rows, null, 2));
  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
