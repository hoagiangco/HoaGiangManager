const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  // DEFAULT will use localhost if DATABASE_URL is missing
  connectionString: process.env.DATABASE_URL,
});

async function checkDevice() {
  try {
    const res = await pool.query('SELECT d."ID", d."Status" FROM "Device" d JOIN "DamageReport" dr ON d."ID" = dr."DeviceID" WHERE dr."ID" = 83');
    console.log('Device for report 83:', res.rows[0]);
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await pool.end();
  }
}

checkDevice();
