import pool from '../lib/db/index';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'migrations', '2026-05-14_create_inventory_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running inventory migration...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Inventory tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
