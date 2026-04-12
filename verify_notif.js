const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const pool = new Pool({ connectionString: env.DATABASE_URL });

async function testAssignment() {
  try {
    // 1. Find a report to assign
    const res = await pool.query('SELECT "ID", "HandlerID" FROM "DamageReport" ORDER BY "ID" DESC LIMIT 1');
    const report = res.rows[0];
    if (!report) return console.log('No reports found to test.');

    const reportId = report.ID;
    const targetStaffId = 6; // Dương Hoàng Trang

    console.log(`Testing assignment of report ${reportId} to staff ${targetStaffId}`);

    // We can't easily call the TS service from here without complexity, 
    // but we can check the database after the user performs the action manually.
    // OR we can just check if any notifications ALREADY exists for StaffId 6.
    
    const notifRes = await pool.query('SELECT "ID", "Title", "StaffId", "CreatedAt" FROM "Notification" WHERE "StaffId" = $1 ORDER BY "CreatedAt" DESC', [targetStaffId]);
    console.log('--- Targeted Notifications for Trang ---');
    console.log(notifRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

testAssignment();
