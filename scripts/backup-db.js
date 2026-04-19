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

  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(backupDir, filename);

  console.log(`Starting backup to ${filepath}...`);

  // We use pg_dump. On Windows, ensure it's in your PATH or provide full path.
  // We use double quotes around URL to handle special characters.
  const command = `pg_dump "${databaseUrl}" -f "${filepath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup failed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`Backup completed successfully: ${filename}`);
    
    // Optional: Compression
    // const gzipCommand = `gzip "${filepath}"`;
    // exec(gzipCommand, ...);
  });
}

runBackup();
