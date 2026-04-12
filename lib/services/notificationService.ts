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
      let subsQuery = '';
      const params: any[] = [];

      if (data.staffId) {
        // Targeted push: Only users linked to this StaffId (Task assigned to staff)
        subsQuery = `
          SELECT ps."Endpoint", ps."P256dh", ps."Auth" 
          FROM "PushSubscription" ps
          JOIN "Staff" s ON ps."UserId" = s."UserId"
          WHERE s."ID" = $1
        `;
        params.push(data.staffId);
        console.log(`[Push] Targeting staff ID: ${data.staffId}`);
      } else {
        // Broadcast to all Admins (e.g., new report created)
        subsQuery = `
          SELECT ps."Endpoint", ps."P256dh", ps."Auth" 
          FROM "PushSubscription" ps
          JOIN "AspNetUserRoles" ur ON ps."UserId" = ur."UserId"
          JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
          WHERE r."Name" = 'Admin'
        `;
        console.log('[Push] Broadcasting to all Admins');
      }

      const subsRes = await pool.query(subsQuery, params);
      const payload = {
        title: data.title,
        body: data.content || '',
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        data: {
          url: data.targetUrl || '/dashboard'
        },
        vibrate: [100, 50, 100],
      };

      console.log(`[Push] Sending to ${subsRes.rows.length} subscribers`);

      for (const row of subsRes.rows) {
        const sub = {
          endpoint: row.Endpoint,
          keys: {
            p256dh: row.P256dh,
            auth: row.Auth
          }
        };
        // Background send to not block the main flow
        sendPushNotification(sub as any, payload).catch(err => {
          console.error('[Push] Single send failed:', err);
        });
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }
}
