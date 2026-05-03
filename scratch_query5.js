const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1].trim();

const client = new Client({ connectionString });
async function main() {
  await client.connect();
  const res = await client.query(`SELECT "ID", "Title", "RelatedReportID" FROM "Event" WHERE "Title" LIKE '%hố nước%'`);
  console.log('Events:', res.rows);
  process.exit(0);
}
main().catch(console.error);
