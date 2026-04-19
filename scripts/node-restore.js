const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function nodeRestore() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const backupFile = path.join(__dirname, '../backups/backup-clean.sql');
    console.log(`Reading backup file ${backupFile}...`);
    const sql = fs.readFileSync(backupFile, 'utf8');

    console.log('Executing SQL... (this may take a moment)');
    // pg driver's query can execute multiple statements separated by semicolon 
    // IF it's a single string and not parameterized.
    await pool.query(sql);
    
    console.log('✅ Restore successful via Node.js!');

    const res = await pool.query('SELECT count(*) FROM "AspNetUsers"');
    console.log(`📊 Verification: AspNetUsers has ${res.rows[0].count} rows.`);

  } catch (err) {
    console.error('❌ Restore failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.where) console.error('Where:', err.where);
  } finally {
    await pool.end();
  }
}

nodeRestore();
