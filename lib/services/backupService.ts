import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
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
  private static backupDir = path.join(process.cwd(), 'backups');

  /**
   * Triggers a database backup using pg_dump (or JS fallback)
   * Saves directly to local backups/ directory
   */
  static async createBackup(): Promise<{ localPath: string; filename: string }> {
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
    
    // Ensure backup directory exists
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
        await execPromise(`${pgDump} --no-owner --no-privileges --clean --if-exists --format=c --blobs --file="${localPath}" "${databaseUrl}"`);
      } catch (execError: any) {
        console.warn('pg_dump failed, falling back to JS-based backup:', execError.message);
        // Fallback to JS-based backup (plain SQL)
        usedCustomFormat = false;
        const sqlFilename = `hgmanager_backup-${timestamp}.sql`;
        localPath = path.join(this.backupDir, sqlFilename);
        await this.jsBackup(databaseUrl, localPath);
      }
      
      const finalFilename = path.basename(localPath);
      console.log(`Backup created locally at ${localPath}`);

      return { localPath, filename: finalFilename };
    } catch (error: any) {
      console.error('Backup error:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Lists all available local backups
   */
  static async listBackups(): Promise<BackupItem[]> {
    const backups: BackupItem[] = [];

    if (fs.existsSync(this.backupDir)) {
      const files = fs.readdirSync(this.backupDir);
      files.forEach(file => {
        if (file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.bak')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          backups.push({
            name: file,
            url: `/api/admin/backup?download=${encodeURIComponent(file)}`,
            size: stats.size,
            uploadedAt: stats.mtime
          });
        }
      });
    }

    // Sort by date descending
    return backups.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  /**
   * Validates backup filename to prevent directory traversal and injection
   */
  public static validateBackupName(name: string): string {
    const cleanName = path.basename(name);
    if (!cleanName || cleanName !== name || !/^[a-zA-Z0-9_\-\.]+$/.test(cleanName)) {
      throw new Error('Tên bản sao lưu không hợp lệ');
    }
    if (!cleanName.endsWith('.dump') && !cleanName.endsWith('.sql') && !cleanName.endsWith('.bak')) {
      throw new Error('Định dạng bản sao lưu không được hỗ trợ');
    }
    return cleanName;
  }

  /**
   * Gets absolute path to a local backup file
   */
  static getBackupFilePath(name: string): string {
    const safeName = this.validateBackupName(name);
    const filePath = path.join(this.backupDir, safeName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy file bản sao lưu: ${safeName}`);
    }
    return filePath;
  }

  /**
   * Deletes a local backup
   */
  static async deleteBackup(name: string): Promise<void> {
    const safeName = this.validateBackupName(name);
    const localPath = path.join(this.backupDir, safeName);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    } else {
      throw new Error('Không tìm thấy bản sao lưu để xóa');
    }
  }

  /**
   * Restores a database from a local backup
   */
  static async restoreBackup(name: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const safeName = this.validateBackupName(name);
    const restorePath = path.join(this.backupDir, safeName);

    if (!fs.existsSync(restorePath)) {
      throw new Error(`Không tìm thấy file bản sao lưu: ${safeName}`);
    }

    try {
      // 1. Create a safety backup first - MUST succeed before proceeding
      try {
        console.log('Creating safety backup before restore...');
        await this.createBackup();
      } catch (e: any) {
        throw new Error(`Không thể tạo bản sao lưu an toàn trước khi phục hồi: ${e.message}. Quá trình phục hồi đã bị dừng để đảm bảo an toàn dữ liệu.`);
      }

      // 2. Run pg_restore, psql or JS-based restore
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
