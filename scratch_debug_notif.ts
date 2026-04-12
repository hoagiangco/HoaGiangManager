import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import pool from './lib/db';

async function debug() {
  try {
    console.log('--- Checking Staff ---');
    const staffRes = await pool.query('SELECT "ID", "Name", "UserId" FROM "Staff" WHERE "Name" ILIKE $1', ['%Trang%']);
    console.log('Staff found:', staffRes.rows);

    if (staffRes.rows.length > 0) {
      const userIds = staffRes.rows.map(s => s.UserId).filter(Boolean);
      console.log('--- Checking Subscriptions for these UserIds ---');
      if (userIds.length > 0) {
        const subRes = await pool.query('SELECT "ID", "UserId", "Endpoint" FROM "PushSubscription" WHERE "UserId" = ANY($1)', [userIds]);
        console.log('Subscriptions found:', subRes.rows);
      } else {
        console.log('No UserIds found for these staff members.');
      }
    }

    console.log('--- Checking Recent Notifications ---');
    const notifRes = await pool.query('SELECT "ID", "Title", "StaffId", "CreatedAt" FROM "Notification" ORDER BY "CreatedAt" DESC LIMIT 5');
    console.log('Recent Notifications:', notifRes.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error debugging:', err);
    process.exit(1);
  }
}

debug();
