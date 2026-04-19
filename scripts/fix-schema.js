const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function fixSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Fixing schema...');
    await pool.query('CREATE SCHEMA IF NOT EXISTS public');
    await pool.query('GRANT ALL ON SCHEMA public TO neondb_owner');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ Schema fixed.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixSchema();
