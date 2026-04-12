const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually to avoid dotenv issues in evaluation
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const pool = new Pool({
  connectionString: env.DATABASE_URL
});

async function run() {
  try {
    const nameSearch = '%Trang%';
    console.log(`Searching for staff matching: ${nameSearch}`);
    const staffRes = await pool.query('SELECT "ID", "Name", "UserId" FROM "Staff" WHERE "Name" ILIKE $1', [nameSearch]);
    console.log('--- Staff Records ---');
    console.log(staffRes.rows);

    if (staffRes.rows.length > 0) {
      const uids = staffRes.rows.map(r => r.UserId).filter(Boolean);
      console.log('--- Subscriptions for those UserIds ---');
      if (uids.length > 0) {
        const subRes = await pool.query('SELECT "ID", \"UserId\", \"Endpoint\", \"CreatedAt\" FROM \"PushSubscription\" WHERE \"UserId\" = ANY($1)', [uids]);
        console.log(subRes.rows);
      } else {
        console.log('No UserIds linked to these staff members.');
      }
    }

    console.log('--- Recent Notifications ---');
    const notifRes = await pool.query('SELECT \"ID\", \"Title\", \"StaffId\", \"CreatedAt\" FROM \"Notification\" ORDER BY \"CreatedAt\" DESC LIMIT 5');
    console.log(notifRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
