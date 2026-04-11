/**
 * Standalone migration runner - loads .env.local first then connects directly
 */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

// Load env vars FIRST before any other imports
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-sql-migration.js <migration-file.sql>');
  process.exit(1);
}

async function runSqlMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ Connected to database`);

    const migrationPath = path.join(process.cwd(), 'scripts', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`🔄 Running migration: ${migrationFile}...`);

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log(`✅ Migration "${migrationFile}" completed successfully!`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSqlMigration();
