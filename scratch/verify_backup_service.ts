import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { BackupService } from '../lib/services/backupService';
import fs from 'fs';

async function verifyBackupService() {
  console.log('Testing BackupService.createBackup()...');
  try {
    const result = await BackupService.createBackup();
    console.log('Backup Result:', result);
    
    if (result.localPath && fs.existsSync(result.localPath)) {
      const content = fs.readFileSync(result.localPath, 'utf8');
      console.log('Backup content preview:', content.substring(0, 200));
      console.log('Backup file size:', fs.statSync(result.localPath).size, 'bytes');
    }
  } catch (error) {
    console.error('Backup Service Test Failed:', error);
  }
}

verifyBackupService();
