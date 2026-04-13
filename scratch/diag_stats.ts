import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { Client } from 'pg'; 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 

async function test() {
  await client.connect();

  console.log('--- DEVICE STATUS CHECK ---');
  try {
    const res = await client.query('SELECT "Status", COUNT(*) as count FROM "Device" GROUP BY "Status"');
    console.log('Device Rows:', res.rows);
    if (res.rows.length > 0) {
        console.log('Type of Status:', typeof res.rows[0].Status);
    }
  } catch(e: any) {
    console.error('Device Error:', e.message);
  }

  console.log('\n--- DAMAGE REPORT STATUS CHECK ---');
  try {
    const res = await client.query('SELECT "Status", COUNT(*) as count FROM "DamageReport" GROUP BY "Status"');
    console.log('Report Rows:', res.rows);
    if (res.rows.length > 0) {
        console.log('Type of Status:', typeof res.rows[0].Status);
    }
  } catch(e: any) {
    console.error('Report Error:', e.message);
  }

  client.end();
}
test();
