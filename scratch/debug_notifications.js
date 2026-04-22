const pool = require('./lib/db');

async function debug() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const isAdmin = true; // Simulating Admin
    const userId = '8d925821-419b-449e-9535-3c1a3b98c393'; // Example UUID from previous logs if any, or just a dummy

    console.log('Parameters:', { today, nextMonth, isAdmin, userId });

    // Test overdue query
    try {
      const res = await pool.query(
        `
        SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text)) as count
        FROM "DeviceReminderPlan" p
        WHERE p."IsActive" = true
          AND p."NextDueDate" IS NOT NULL
          AND p."NextDueDate" < $1
          AND ($2 = true OR (
            p."Metadata" ? 'assignedStaffId' AND 
            (p."Metadata"->>'assignedStaffId')::integer IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $3)
          ))
        `,
        [today, isAdmin, userId]
      );
      console.log('Overdue Result:', res.rows[0].count);
    } catch (err) {
      console.error('Overdue Query Failed:', err.message);
    }

    // Test upcoming query
    try {
       const res = await pool.query(
        `
        SELECT COUNT(DISTINCT COALESCE(p."Metadata"->>'maintenanceBatchId', 'no-batch-' || p."ID"::text)) as count
        FROM "DeviceReminderPlan" p
        WHERE p."IsActive" = true
          AND p."NextDueDate" IS NOT NULL
          AND p."NextDueDate" >= $1
          AND p."NextDueDate" <= $2
          AND ($3 = true OR (
            p."Metadata" ? 'assignedStaffId' AND 
            (p."Metadata"->>'assignedStaffId')::integer IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $4)
          ))
        `,
        [today, nextMonth, isAdmin, userId]
      );
      console.log('Upcoming Result:', res.rows[0].count);
    } catch (err) {
      console.error('Upcoming Query Failed:', err.message);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    process.exit();
  }
}

debug();
