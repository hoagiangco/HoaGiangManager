import pool from '../lib/db';
import { NotificationService, NotificationType, NotificationCategory } from '../lib/services/notificationService';
import { format } from 'date-fns';
import { getVNNow } from '../lib/utils/dateFormat';

async function checkWorkPlanReminders() {
  console.log('⏰ Checking work plan reminders...');
  const today = format(getVNNow(), 'yyyy-MM-dd');
  const notificationService = new NotificationService();

  try {
    // Find all staff who have work plan items for today that are not yet implemented
    const result = await pool.query(
      `SELECT DISTINCT "StaffID" 
       FROM "WorkPlanItem" 
       WHERE "PlanDate" = $1 AND "IsImplemented" = FALSE`,
      [today]
    );

    console.log(`Found ${result.rows.length} staff members with plans for today.`);

    for (const row of result.rows) {
      const staffId = row.StaffID;

      // Get count of items
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM "WorkPlanItem" 
         WHERE "PlanDate" = $1 AND "StaffID" = $2 AND "IsImplemented" = FALSE`,
        [today, staffId]
      );
      const count = countRes.rows[0].count;

      // Create notification
      await notificationService.createNotification({
        title: 'Kế hoạch công việc hôm nay 📋',
        content: `Bạn có ${count} công việc được lên kế hoạch cho ngày hôm nay. Hãy kiểm tra và triển khai ngay!`,
        type: NotificationType.System,
        category: NotificationCategory.Reminder,
        targetUrl: '/dashboard/work-plan',
        staffId: staffId
      });

      console.log(`Sent notification to staff ID: ${staffId}`);
    }

    console.log('✅ Work plan reminders check completed.');
  } catch (error) {
    console.error('❌ Error checking work plan reminders:', error);
  } finally {
    process.exit(0);
  }
}

checkWorkPlanReminders();
