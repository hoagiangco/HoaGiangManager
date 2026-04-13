import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { Client } from 'pg'; 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 

async function test() {
  await client.connect();

  try {
    const activeMaintenanceQuery = `
      SELECT COUNT("ID") as count
      FROM "Event"
      WHERE "EventTypeID" IN (
        SELECT "ID" FROM "EventType" WHERE "Category" = 'maintenance'
      ) AND "Status" != 'completed' AND "Status" != 'cancelled'
    `;
    console.log('Testing Maintenance Query...');
    await client.query(activeMaintenanceQuery);
    console.log('Maintenance OK');
  } catch(e: any) {
    console.error('Maintenance Query Error:', e.message);
  }

  try {
    const activeMaintenanceQueryOriginal = `
      SELECT COUNT("ID") as count
      FROM "Event"
      WHERE "EventTypeId" IN (
        SELECT "Id" FROM "EventType" WHERE "Category" = 'maintenance'
      ) AND "Status" != 'completed' AND "Status" != 'cancelled'
    `;
    console.log('Testing Original Maintenance Query...');
    await client.query(activeMaintenanceQueryOriginal);
    console.log('Original Maintenance OK');
  } catch(e: any) {
    console.error('Original Maintenance Query Error:', e.message);
  }

  try {
    const devicesQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "Device"
      WHERE 1=1 
      GROUP BY "Status"
    `;
    console.log('Testing Devices Query...');
    await client.query(devicesQuery);
    console.log('Devices OK');
  } catch(e: any) {
    console.error('Devices Query Error:', e.message);
  }

  try {
    const reportsQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "DamageReport"
      WHERE 1=1 
      GROUP BY "Status"
    `;
    console.log('Testing Reports Query...');
    await client.query(reportsQuery);
    console.log('Reports OK');
  } catch(e: any) {
    console.error('Reports Query Error:', e.message);
  }

  client.end();
}
test();
