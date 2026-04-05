const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' }); // Try different env files
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addEnumValue() {
  try {
    console.log('Adding "5" to device_status enum...');
    // In PostgreSQL, you can't run ALTER TYPE ... ADD VALUE in a transaction block 
    // unless you use pg_enum table directly (complex) or simply run it outside.
    // pg driver doesn't automatically wrap in a transaction unless told.
    await pool.query('ALTER TYPE device_status ADD VALUE IF NOT EXISTS \'5\'');
    console.log('✅ Successfully added "5" to device_status enum!');
  } catch (err) {
    if (err.message.includes('already exists')) {
        console.log('Value "5" already exists in device_status enum.');
    } else {
        console.error('❌ Failed to add enum value:', err);
    }
  } finally {
    await pool.end();
  }
}

addEnumValue();
