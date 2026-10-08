const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:1@localhost:5432/HoaGiang'
});
async function run() {
  try {
    const res = await pool.query('SELECT * FROM "DamageReport" WHERE "MaintenanceBatchId" IS NOT NULL LIMIT 2');
    console.log('DamageReports:', JSON.stringify(res.rows, null, 2));
    const events = await pool.query('SELECT * FROM "Event" WHERE "Metadata"->>''maintenanceBatchId'' IS NOT NULL LIMIT 2');
    console.log('Events:', JSON.stringify(events.rows, null, 2));
  } catch(e) { console.error(e) } finally { pool.end() }
}
run();