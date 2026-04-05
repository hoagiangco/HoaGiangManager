const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkTable() {
  try {
    const res = await pool.query('SELECT 1 FROM "PushSubscription" LIMIT 1');
    console.log('✅ TABLE PushSubscription EXISTS');
  } catch (err) {
    if (err.code === '42P01') {
      console.log('❌ TABLE PushSubscription MISSING');
    } else {
      console.error('❌ Error checking table:', err.message);
    }
  } finally {
    await pool.end();
  }
}

checkTable();
