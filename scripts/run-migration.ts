import pool from '../lib/db/index';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function runMigration(migrationFileName: string) {
  const client = await pool.connect();
  
  try {
    console.log(`🔄 Starting migration: ${migrationFileName}...\n`);
    
    await client.query('BEGIN');

    // Read SQL migration file
    const migrationPath = join(__dirname, 'migrations', migrationFileName);
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute SQL
    await client.query(sql);

    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  try {
    const migrationFile = process.argv[2] || '2025-11-18_update_damage_report_check_constraint.sql';
    await runMigration(migrationFile);
    console.log('\n✅ Migration process completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  }
}

main();

