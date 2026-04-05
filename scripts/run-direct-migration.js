const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const sqlFile = path.join(__dirname, 'migrations', '2026-04-03_create_push_subscription_table.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  try {
    console.log('Running migration: 2026-04-03_create_push_subscription_table.sql');
    await pool.query(sql);
    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
