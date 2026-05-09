
import pool from '../lib/db';

async function migrate() {
  console.log('Starting migration of maintenance content...');

  try {
    // 1. Update DamageReport table
    // Old format: "Bảo trì định kỳ: [Title] [Batch: [BatchId]]"
    // New format: "[Title] - [BatchId]"
    
    // We can use regex replacement in PostgreSQL
    const updateReportsQuery = `
      UPDATE "DamageReport"
      SET "DamageContent" = regexp_replace(
        "DamageContent", 
        '^Bảo trì định kỳ: (.*?) \\[Batch: (.*?)\\]$', 
        '\\1 - \\2'
      )
      WHERE "DamageContent" ~ '^Bảo trì định kỳ: .* \\[Batch: .*\\]$'
    `;

    const reportResult = await pool.query(updateReportsQuery);
    console.log(`Updated ${reportResult.rowCount} reports in DamageReport table.`);

    // 2. Update Notification table
    // Notifications can have various titles and contents.
    // Content examples:
    // "Bạn được giao xử lý báo cáo: Bảo trì định kỳ: [Title] [Batch: [BatchId]]"
    // "Trần Văn Đen: Bảo trì định kỳ: [Title] [Batch: [BatchId]]"
    // "Báo cáo: Bảo trì định kỳ: [Title] [Batch: [BatchId]]... đã được hoàn thành."

    const updateNotificationsQuery = `
      UPDATE "Notification"
      SET "Content" = regexp_replace(
        "Content", 
        'Bảo trì định kỳ: (.*?) \\[Batch: (.*?)\\]', 
        '\\1 - \\2',
        'g'
      )
      WHERE "Content" ~ 'Bảo trì định kỳ: .* \\[Batch: .*\\]'
    `;

    const notificationResult = await pool.query(updateNotificationsQuery);
    console.log(`Updated ${notificationResult.rowCount} notifications in Notification table.`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
