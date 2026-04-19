import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { put, list, del } from '@vercel/blob';
import axios from 'axios';

const execPromise = promisify(exec);

export interface BackupItem {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export class BackupService {
  private static backupDir = path.join(process.cwd(), 'backups');

  /**
   * Triggers a database backup using pg_dump
   * @returns The path or URL of the created backup
   */
  static async createBackup(): Promise<{ localPath?: string; blobUrl?: string }> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    
    // Ensure backup directory exists (for local fallback)
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const localPath = path.join(this.backupDir, filename);

    try {
      // 1. Run pg_dump
      // We use double quotes around the database URL to handle special characters safely
      await execPromise(`pg_dump "${databaseUrl}" -f "${localPath}"`);
      
      console.log(`Backup created locally at ${localPath}`);

      // 2. Check if Vercel Blob is configured
      const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN && 
                          process.env.BLOB_READ_WRITE_TOKEN !== 'your_blob_token_here' && 
                          !process.env.BLOB_READ_WRITE_TOKEN.startsWith('YOUR_');

      if (hasBlobToken) {
        const fileBuffer = fs.readFileSync(localPath);
        const blob = await put(`backups/${filename}`, fileBuffer, {
          access: 'public',
          contentType: 'application/sql',
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
        if (file.endsWith('.sql')) {
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
      await this.createBackup();

      // 2. Download from blob if needed
      if (url.startsWith('http')) {
        console.log(`Downloading backup from ${url}...`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        if (!fs.existsSync(this.backupDir)) {
          fs.mkdirSync(this.backupDir, { recursive: true });
        }
        fs.writeFileSync(restorePath, Buffer.from(response.data));
      }

      // 3. Run psql
      // On some systems/configs, we might need to drop everything first.
      // A standard pg_dump with --clean --if-exists would be better, 
      // but let's assume the user wants to restore whatever they have.
      console.log(`Restoring database from ${restorePath}...`);
      
      // Note: This command might fail if there are active connections.
      // For a more robust solution, we'd kill active connections first.
      await execPromise(`psql "${databaseUrl}" -f "${restorePath}"`);
      
      console.log('Restore completed successfully');

      // 4. Cleanup downloaded file if it was from blob
      if (url.startsWith('http') && fs.existsSync(restorePath)) {
        fs.unlinkSync(restorePath);
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }
}
