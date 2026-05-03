const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1].trim();

const client = new Client({ connectionString });
async function main() {
  await client.connect();
  const res = await client.query('SELECT "DeviceID" FROM "Event" LIMIT 1');
  console.log('Row keys:', Object.keys(res.rows[0]));
  console.log('Row value:', res.rows[0]);
  process.exit(0);
}
main().catch(console.error);
