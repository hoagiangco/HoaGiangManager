import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { Client } from 'pg'; 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 

async function test() {
  await client.connect();

  try {
    const q1 = `
      SELECT "Status", COUNT("ID") as count
      FROM "DamageReport"
      WHERE "ReportingDepartmentId" = 1 
      GROUP BY "Status"
    `;
    await client.query(q1);
    console.log('ReportingDepartmentId OK');
  } catch(e: any) {
    console.error('ReportingDepartmentId Error:', e.message);
  }

  try {
    const q2 = `
      SELECT "Status", COUNT("ID") as count
      FROM "Device"
      WHERE "DepartmentId" = 1 
      GROUP BY "Status"
    `;
    await client.query(q2);
    console.log('DepartmentId OK');
  } catch(e: any) {
    console.error('DepartmentId Error:', e.message);
  }

  client.end();
}
test();
