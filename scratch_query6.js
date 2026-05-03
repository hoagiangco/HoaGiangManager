const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1].trim();

const client = new Client({ connectionString });
async function main() {
  await client.connect();
  try {
    const res = await client.query(`SELECT '266' = $1 as match`, [266]);
    console.log('Match 1:', res.rows[0].match);
  } catch (e) {
    console.error('Error 1:', e.message);
  }
  
  try {
    const res2 = await client.query(`SELECT ('{"maintenanceBatchId": 266}'::jsonb ->> 'maintenanceBatchId') = $1 as match`, [266]);
    console.log('Match 2:', res2.rows[0].match);
  } catch (e) {
    console.error('Error 2:', e.message);
  }
  process.exit(0);
}
main().catch(console.error);
