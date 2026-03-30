const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('Connecting to database...');
  try {
    const res = await pool.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Event' 
        AND is_nullable = 'NO' 
        AND column_default IS NULL
    `);
    console.log('NOT NULL columns with no default:', res.rows);
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await pool.end();
  }
}

check();
