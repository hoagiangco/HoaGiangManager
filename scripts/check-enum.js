const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkEnum() {
  try {
    const res = await pool.query(`
      SELECT n.nspname as schema, t.typname as type, e.enumlabel as label
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'device_status' OR t.typname ILIKE '%status%';
    `);
    console.table(res.rows);
  } catch (err) {
    console.error('Error checking enum:', err);
  } finally {
    await pool.end();
  }
}

checkEnum();
