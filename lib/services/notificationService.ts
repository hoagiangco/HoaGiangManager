import pool from '../db';
import { sendPushNotification } from '../notifications/web-push';

export enum NotificationType {
  Report = 'report',
  Maintenance = 'maintenance',
  System = 'system'
}

export enum NotificationCategory {
  New = 'new',
  InProgress = 'in_progress',
  Completed = 'completed',
  Upcoming = 'upcoming',
  Reminder = 'reminder'
}

export class NotificationService {
  /**
   * Create a notification and optionally send a push notification
   */
  async createNotification(data: {
    title: string;
    content?: string;
    type: NotificationType;
    category: NotificationCategory;
    targetUrl?: string;
    staffId?: number | null; // Targeted staff. NULL for all admins.
    createdBy?: string;
  }) {
    try {
      // 1. Save to database
      const result = await pool.query(
        `INSERT INTO "Notification" ("Title", "Content", "Type", "Category", "TargetUrl", "StaffId", "CreatedBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING "ID"`,
        [
          data.title,
          data.content || null,
          data.type,
          data.category,
          data.targetUrl || null,
          data.staffId || null,
          data.createdBy || null
        ]
      );

      const notificationId = result.rows[0].ID;

      // 2. Send Web Push
      // In a real production app, you might only push for certain high-priority notifications
      // or filter by user preferences.
      await this.sendPushToRelevantUsers(data);

      return notificationId;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw error to avoid breaking the main business flow
    }
  }

  private async sendPushToRelevantUsers(data: any) {
    try {
      let subsQuery = 'SELECT "Endpoint", "P256dh", "Auth" FROM "PushSubscription"';
      const params: any[] = [];

      if (data.staffId) {
        // Targeted push: Only users linked to this StaffId
        subsQuery = `
          SELECT ps."Endpoint", ps."P256dh", ps."Auth" 
          FROM "PushSubscription" ps
          JOIN "AspNetUsers" u ON ps."Endpoint" IS NOT NULL -- This is a simplification
          -- Real logic would involve joining with a table mapping subscriptions to UserIds
          -- Since the current schema doesn't seem to have a userId in PushSubscription, 
          -- we'll just broadcast for now or skip targeted push if we can't link them easily.
        `;
        // NOTE: The current PushSubscription table doesn't have a UserId field.
        // It seems to be a generic broadcast table for now.
      }

      const subsRes = await pool.query(subsQuery, params);
      const payload = {
        title: data.title,
        body: data.content || '',
        icon: '/icons/icon.svg',
        data: {
          url: data.targetUrl || '/dashboard'
        }
      };

      for (const row of subsRes.rows) {
        const sub = {
          endpoint: row.Endpoint,
          keys: {
            p256dh: row.P256dh,
            auth: row.Auth
          }
        };
        await sendPushNotification(sub as any, payload);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }
}
