import pool from '../lib/db/index';

async function deleteDeviceAndRelations(deviceId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if device exists
    const deviceRes = await client.query('SELECT * FROM "Device" WHERE "ID" = $1', [deviceId]);
    if (deviceRes.rowCount === 0) {
      console.log(`Device ID ${deviceId} not found.`);
      await client.query('ROLLBACK');
      return;
    }
    console.log(`Found device: ${deviceRes.rows[0].Name} (ID: ${deviceRes.rows[0].ID})`);

    // 1. Delete Event
    console.log('Deleting from Event...');
    const eventRes = await client.query('DELETE FROM "Event" WHERE "DeviceID" = $1 RETURNING "ID"', [deviceId]);
    console.log(`Deleted ${eventRes.rowCount} rows from Event: ${eventRes.rows.map(r => r.ID).join(', ')}`);

    // 2. Delete DeviceReminderPlan
    console.log('Deleting from DeviceReminderPlan...');
    const reminderRes = await client.query('DELETE FROM "DeviceReminderPlan" WHERE "DeviceID" = $1 RETURNING "ID"', [deviceId]);
    console.log(`Deleted ${reminderRes.rowCount} rows from DeviceReminderPlan: ${reminderRes.rows.map(r => r.ID).join(', ')}`);

    // 3. Delete DamageReport
    console.log('Deleting from DamageReport...');
    // But wait, there might be Event that references DamageReport but doesn't have DeviceID?
    // Let's delete DamageReport that have DeviceID.
    const damageRes = await client.query('DELETE FROM "DamageReport" WHERE "DeviceID" = $1 RETURNING "ID"', [deviceId]);
    console.log(`Deleted ${damageRes.rowCount} rows from DamageReport: ${damageRes.rows.map(r => r.ID).join(', ')}`);

    // 4. Delete Device
    console.log('Deleting from Device...');
    const delDeviceRes = await client.query('DELETE FROM "Device" WHERE "ID" = $1', [deviceId]);
    console.log(`Deleted ${delDeviceRes.rowCount} rows from Device.`);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Deletion successful.');

  } catch (err) {
    console.error('Error during deletion:', err);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    pool.end();
  }
}

deleteDeviceAndRelations(143);
