import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { put, list, del } from '@vercel/blob';
import axios from 'axios';

import { Client } from 'pg';
import { getVNNow } from '../utils/dateFormat';

const execPromise = promisify(exec);

/**
 * Helper to find PostgreSQL binaries on Windows
 */
function getPgBin(binName: string): string {
  if (process.platform !== 'win32') return binName;
  
  const searchPaths = [
    `C:\\Program Files\\PostgreSQL\\18\\bin\\${binName}.exe`,
    `C:\\Program Files\\PostgreSQL\\17\\bin\\${binName}.exe`,
    `C:\\Program Files\\PostgreSQL\\16\\bin\\${binName}.exe`,
    `C:\\Program Files\\PostgreSQL\\15\\bin\\${binName}.exe`,
    `C:\\Program Files\\PostgreSQL\\14\\bin\\${binName}.exe`,
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return `"${p}"`;
  }
  
  return binName;
}

export interface BackupItem {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export class BackupService {
  private static backupDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'backups');

  /**
   * Triggers a database backup using pg_dump
   * @returns The path or URL of the created backup
   */
  static async createBackup(): Promise<{ localPath?: string; blobUrl?: string }> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const now = getVNNow();
    const timestamp = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const filename = `hgmanager_backup-${timestamp}.dump`;
    
    // Ensure backup directory exists (for local fallback)
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    let localPath = path.join(this.backupDir, filename);

    try {
      // 1. Try running pg_dump with Custom Format (-Fc)
      let usedCustomFormat = true;
      try {
        const pgDump = getPgBin('pg_dump');
        console.log(`Attempting ${pgDump} (custom format) to ${localPath}...`);
        // Use custom format (-Fc), blobs, and clean flags for easy restore
        await execPromise(`${pgDump} --no-owner --no-privileges --clean --if-exists --format=c --blobs --file="${localPath}" "${databaseUrl}"`);
      } catch (execError: any) {
        console.warn('pg_dump failed, falling back to JS-based backup:', execError.message);
        // Fallback to JS-based backup (always plain SQL)
        usedCustomFormat = false;
        const sqlFilename = `hgmanager_backup-${timestamp}.sql`;
        localPath = path.join(this.backupDir, sqlFilename);
        await this.jsBackup(databaseUrl, localPath);
      }
      
      const finalFilename = path.basename(localPath);
      console.log(`Backup created at ${localPath}`);

      // 2. Check if Vercel Blob is configured
      const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN && 
                          process.env.BLOB_READ_WRITE_TOKEN !== 'your_blob_token_here' && 
                          !process.env.BLOB_READ_WRITE_TOKEN.startsWith('YOUR_');

      if (hasBlobToken) {
        const fileBuffer = fs.readFileSync(localPath);
        const blob = await put(`backups/${finalFilename}`, fileBuffer, {
          access: 'public',
          contentType: usedCustomFormat ? 'application/octet-stream' : 'application/sql',
        });
        
        console.log(`Backup uploaded to Vercel Blob: ${blob.url}`);
        
        // After uploading to blob, we can optionally delete the local file if we are in production
        if (process.env.NODE_ENV === 'production') {
          fs.unlinkSync(localPath);
        }
        
        return { blobUrl: blob.url };
      }

      return { localPath };
    } catch (error: any) {
      console.error('Backup error:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Lists all available backups (from Blob or local)
   */
  static async listBackups(): Promise<BackupItem[]> {
    const backups: BackupItem[] = [];

    // 1. List from Vercel Blob
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN && 
                          process.env.BLOB_READ_WRITE_TOKEN !== 'your_blob_token_here' && 
                          !process.env.BLOB_READ_WRITE_TOKEN.startsWith('YOUR_');

    if (hasBlobToken) {
      try {
        const { blobs } = await list({ prefix: 'backups/' });
        blobs.forEach(b => {
          backups.push({
            name: b.pathname.replace('backups/', ''),
            url: b.url,
            size: b.size,
            uploadedAt: b.uploadedAt
          });
        });
      } catch (error) {
        console.error('Error listing blobs:', error);
      }
    }

    // 2. List from local storage if any (only if not on Vercel)
    if (fs.existsSync(this.backupDir)) {
      const files = fs.readdirSync(this.backupDir);
      files.forEach(file => {
        if (file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.bak')) {
          const stats = fs.statSync(path.join(this.backupDir, file));
          // Don't duplicate if already in blob (matching by name)
          if (!backups.find(b => b.name === file)) {
            backups.push({
              name: file,
              url: `/backups/${file}`, // This would need a route to serve it
              size: stats.size,
              uploadedAt: stats.mtime
            });
          }
        }
      });
    }

    // Sort by date descending
    return backups.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Deletes a backup
   */
  static async deleteBackup(name: string, url: string): Promise<void> {
    // 1. Delete from Blob if it's a blob URL
    if (url.includes('public.blob.vercel-storage.com')) {
      await del(url);
    }

    // 2. Delete from local if it exists
    const localPath = path.join(this.backupDir, name);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }

  /**
   * Restores a database from a backup
   */
  static async restoreBackup(name: string, url: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    let restorePath = path.join(this.backupDir, name);

    try {
      // 1. Create a safety backup first
      try {
        await this.createBackup();
      } catch (e) {
        console.warn('Failed to create safety backup before restore, proceeding anyway...');
      }

      // 2. Download from blob if needed
      if (url.startsWith('http')) {
        console.log(`Downloading backup from ${url}...`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        // Ensure directory exists
        if (!fs.existsSync(this.backupDir)) {
          fs.mkdirSync(this.backupDir, { recursive: true });
        }
        fs.writeFileSync(restorePath, Buffer.from(response.data));
      }

      // 3. Run pg_restore, psql or JS-based restore
      console.log(`Restoring database from ${restorePath}...`);
      
      const isCustomFormat = restorePath.endsWith('.dump') || restorePath.endsWith('.bak');

      try {
        if (isCustomFormat) {
          // Use pg_restore for custom format
          const pgRestore = getPgBin('pg_restore');
          await execPromise(`${pgRestore} --no-owner --no-privileges --clean --if-exists --dbname="${databaseUrl}" --verbose "${restorePath}"`);
        } else {
          // Use psql for plain SQL
          const psql = getPgBin('psql');
          await execPromise(`${psql} "${databaseUrl}" -f "${restorePath}"`);
        }
      } catch (execError: any) {
        console.warn('Command-line restore failed, falling back to JS-based restore:', execError.message);
        // Fallback to JS-based restore (only works for plain SQL)
        if (!isCustomFormat) {
          await this.jsRestore(databaseUrl, restorePath);
        } else {
          throw new Error(`Cannot restore custom format backup via JS fallback. Please ensure pg_restore is installed. Error: ${execError.message}`);
        }
      }
      
      console.log('Restore completed successfully');

      // 4. Cleanup downloaded file if it was from blob
      if (url.startsWith('http') && fs.existsSync(restorePath)) {
        try { fs.unlinkSync(restorePath); } catch (e) {}
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * Pure JS backup implementation using pg client
   */
  private static async jsBackup(databaseUrl: string, outputPath: string): Promise<void> {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      // Get all user tables
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations', 'migrations')
      `);

      const tables = tablesRes.rows.map(r => r.table_name);
      
      let sql = `-- Hoa Giang Manager Backup\n-- Created: ${getVNNow().toLocaleString('vi-VN')}\n\n`;
      sql += `SET statement_timeout = 0;\nSET client_encoding = 'UTF8';\n\n`;

      for (const table of tables) {
        // Get table data
        const dataRes = await client.query(`SELECT * FROM "${table}"`);
        
        sql += `-- Data for table ${table}\n`;
        // Truncate existing data (be careful with foreign keys)
        sql += `TRUNCATE TABLE "${table}" CASCADE;\n`;

        if (dataRes.rows.length > 0) {
          const columns = dataRes.fields.map(f => f.name);
          const columnNames = columns.map(c => `"${c}"`).join(', ');

          for (const row of dataRes.rows) {
            const values = columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              return val;
            });
            sql += `INSERT INTO "${table}" (${columnNames}) VALUES (${values.join(', ')});\n`;
          }
        }
        sql += `\n`;
      }

      fs.writeFileSync(outputPath, sql);
    } finally {
      await client.end();
    }
  }

  /**
   * Pure JS restore implementation using pg client
   */
  private static async jsRestore(databaseUrl: string, inputPath: string): Promise<void> {
    const sql = fs.readFileSync(inputPath, 'utf8');
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      // For restore, we execute the entire SQL content.
      // Note: pg client's query can execute multiple statements separated by ;
      // but for very large files it might be better to split.
      // Given the file size (~600KB), executing it all at once is fine.
      await client.query(sql);
    } catch (error: any) {
      console.error('JS Restore failed:', error);
      throw new Error(`Pure JS restore failed: ${error.message}`);
    } finally {
      await client.end();
    }
  }
}
