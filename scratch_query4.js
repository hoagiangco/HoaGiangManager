const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1].trim();

const client = new Client({ connectionString });
async function main() {
  await client.connect();
  const res = await client.query('SELECT "DeviceID", "Metadata"->>\'maintenanceBatchId\' as batch_id, count(*) FROM "DeviceReminderPlan" GROUP BY "DeviceID", batch_id HAVING count(*) > 1');
  console.log('Duplicates:', res.rows);
  
  const events = await client.query('SELECT * FROM "Event" WHERE "RelatedReportID" = 266');
  console.log('Events for report 266:', events.rows.length);
  process.exit(0);
}
main().catch(console.error);
