import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:hoang@hoagiang.com', // Replace with your email
    publicKey,
    privateKey
  );
}

export type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  vibrate?: number[];
  silent?: boolean;
};

export async function sendPushNotification(subscription: webpush.PushSubscription, payload: NotificationPayload) {
  try {
    const jsonPayload = JSON.stringify(payload);
    await webpush.sendNotification(subscription, jsonPayload);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return { success: false, expired: true };
    }
    return { success: false, error: error.message };
  }
}
