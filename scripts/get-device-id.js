const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getDeviceId() {
  try {
    const res = await pool.query('SELECT "DeviceID" FROM "DamageReport" WHERE "ID" = 83');
    console.log('Device ID for report 83:', res.rows[0]?.DeviceID);
  } finally {
    await pool.end();
  }
}

getDeviceId();
