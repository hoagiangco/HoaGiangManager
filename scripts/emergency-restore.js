const { exec } = require('child_process');
const { promisify } = require('util');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

const execPromise = promisify(exec);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function emergencyRestore() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    return;
  }

  // Backup file to restore
  const backupFile = path.join(__dirname, '../backups/backup-2026-04-19T14-08-06-194Z.sql');
  
  console.log(`🚀 Starting emergency restore from ${backupFile}...`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('1. Dropping and recreating public schema...');
    const dropSql = `
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO neondb_owner;
      GRANT ALL ON SCHEMA public TO public;
    `;
    await pool.query(dropSql);
    console.log('✅ Public schema recreated.');

    console.log('2. Running restore...');
    // If it's a .dump file, use pg_restore. If .sql, use psql.
    const isCustomFormat = backupFile.endsWith('.dump') || backupFile.endsWith('.bak');
    let command;
    
    if (isCustomFormat) {
      // --no-owner and --no-privileges to avoid permission issues
      // --clean and --if-exists are redundant here since we recreated public schema, 
      // but good to have for general use.
      command = `pg_restore --no-owner --no-privileges --dbname="${databaseUrl}" --verbose "${backupFile}"`;
    } else {
      command = `psql "${databaseUrl}" -f "${backupFile}"`;
    }

    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('finished')) {
      console.warn('⚠️ Restore stderr/info:', stderr);
    }
    
    console.log('✅ Restore command completed.');

    // Verify
    const verifyResult = await pool.query('SELECT count(*) FROM "AspNetUsers"');
    console.log(`✅ Verification: AspNetUsers has ${verifyResult.rows[0].count} rows.`);

  } catch (error) {
    console.error('❌ Emergency restore failed:', error.message);
  } finally {
    await pool.end();
  }
}

emergencyRestore();
