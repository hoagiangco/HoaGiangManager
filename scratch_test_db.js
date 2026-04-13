import pool from './lib/db';

async function test() {
  try {
    const activeMaintenanceQuery = `
      SELECT COUNT("ID") as count
      FROM "Event"
      WHERE "EventTypeId" IN (
        SELECT "Id" FROM "EventType" WHERE "Category" = 'maintenance'
      ) AND "Status" != 'completed' AND "Status" != 'cancelled'
    `;
    console.log('Testing Maintenance Query...');
    await pool.query(activeMaintenanceQuery);
    console.log('Maintenance OK');
  } catch(e) {
    console.error('Maintenance Query Error:', e.message);
  }

  try {
    const devicesQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "Device"
      WHERE 1=1 
      GROUP BY "Status"
    `;
    console.log('Testing Devices Query...');
    await pool.query(devicesQuery);
    console.log('Devices OK');
  } catch(e) {
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
    await pool.query(reportsQuery);
    console.log('Reports OK');
  } catch(e) {
    console.error('Reports Query Error:', e.message);
  }
}
test().finally(() => pool.end());
