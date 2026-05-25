const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hoagiangmanager'
});

async function run() {
  const res = await pool.query(`SELECT "ID", "Status", "RelatedReportID", "Metadata" FROM "Event" WHERE "Metadata"::text LIKE '%batch-2026-04-22-1776832356425%'`);
  console.log(JSON.stringify(res.rows, null, 2));
  
  const res2 = await pool.query(`SELECT "ID", "Status", "MaintenanceBatchId" FROM "DamageReport" WHERE "MaintenanceBatchId" = 'batch-2026-04-22-1776832356425'`);
  console.log('DamageReports:');
  console.log(JSON.stringify(res2.rows, null, 2));
  
  process.exit(0);
}
run();
