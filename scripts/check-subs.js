const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkSubs() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM "PushSubscription"');
    console.log('✅ COUNT PushSubscription:', res.rows[0].count);
  } catch (err) {
    console.error('❌ Error checking subs:', err.message);
  } finally {
    await pool.end();
  }
}

checkSubs();
