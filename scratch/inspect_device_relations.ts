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

    // Find tables referencing Device
    const fkQuery = `
      SELECT
        tc.table_name, 
        kcu.column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'Device' AND ccu.column_name = 'ID';
    `;
    const fkRes = await client.query(fkQuery);
    
    console.log(`Found ${fkRes.rowCount} tables referencing Device:`);
    for (const row of fkRes.rows) {
      console.log(`- ${row.table_name} (${row.column_name})`);
    }

    // Since deleting involves constraints, let's look at the specific tables we know and cascade manually, 
    // or just execute a delete with cascade if the DB supports it, but PG FKs might not have ON DELETE CASCADE.
    // Let's first print the tables to understand what to delete.
    
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('Error:', err);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    pool.end();
  }
}

deleteDeviceAndRelations(143);
