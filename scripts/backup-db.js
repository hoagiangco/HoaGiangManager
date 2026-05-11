const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function runBackup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not defined');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const filename = `backup-${timestamp}.dump`;
  const filepath = path.join(backupDir, filename);

  console.log(`Starting backup to ${filepath}...`);

  // We use pg_dump with Custom format (-Fc) which is best for pg_restore and pgAdmin.
  // --clean and --if-exists make it easier to restore over an existing database.
  // --no-owner and --no-privileges make the backup more portable.
  const command = `pg_dump --no-owner --no-privileges --clean --if-exists --format=c --blobs --verbose --file="${filepath}" "${databaseUrl}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup failed: ${error.message}`);
      console.log('Ensure pg_dump is in your PATH. If not, you can provide the full path to pg_dump.exe');
      return;
    }
    // Note: pg_dump often writes verbose info to stderr even on success
    if (stderr && !stderr.includes('dumping contents')) {
      console.warn(`pg_dump info/warnings:\n${stderr}`);
    }
    console.log(`\n✅ Backup completed successfully: ${filename}`);
    console.log(`📍 Location: ${filepath}`);
    console.log('💡 To restore this file in pgAdmin4:');
    console.log('   1. Right-click your database');
    console.log('   2. Select "Restore"');
    console.log(`   3. Select "${filename}" as the filename`);
    console.log('   4. In "Restore options", you can leave defaults.');
  });
}

runBackup();
