import pool from '../lib/db/index';
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
  try {
    console.log('🔍 Checking data in PostgreSQL...\n');

    // Check Departments
    const deptResult = await pool.query('SELECT COUNT(*) as count FROM "Department"');
    console.log(`📊 Departments: ${deptResult.rows[0].count} records`);

    // Check DeviceCategories
    const catResult = await pool.query('SELECT COUNT(*) as count FROM "DeviceCategory"');
    console.log(`📊 DeviceCategories: ${catResult.rows[0].count} records`);

    // Check Devices
    const devResult = await pool.query('SELECT COUNT(*) as count FROM "Device"');
    console.log(`📊 Devices: ${devResult.rows[0].count} records`);

    // Check Staff
    const staffResult = await pool.query('SELECT COUNT(*) as count FROM "Staff"');
    console.log(`📊 Staff: ${staffResult.rows[0].count} records`);

    // Check Events
    const eventResult = await pool.query('SELECT COUNT(*) as count FROM "Event"');
    console.log(`📊 Events: ${eventResult.rows[0].count} records`);

    // Check EventTypes
    const etResult = await pool.query('SELECT COUNT(*) as count FROM "EventType"');
    console.log(`📊 EventTypes: ${etResult.rows[0].count} records`);

    // Test a query similar to DeviceService
    console.log('\n🔍 Testing DeviceService query...');
    const testQuery = `
      SELECT 
        d."ID" as id,
        d."Name" as name,
        d."Serial" as serial,
        d."Description" as description,
        d."Img" as img,
        d."WarrantyDate" as "warrantyDate",
        d."UseDate" as "useDate",
        d."EndDate" as "endDate",
        d."DepartmentID" as "departmentId",
        dep."Name" as "departmentName",
        d."DeviceCategoryID" as "deviceCategoryId",
        dc."Name" as "deviceCategoryName",
        CAST(d."Status"::text AS INTEGER) as status
      FROM "Device" d
      INNER JOIN "DeviceCategory" dc ON d."DeviceCategoryID" = dc."ID"
      INNER JOIN "Department" dep ON d."DepartmentID" = dep."ID"
      ORDER BY d."Name"
      LIMIT 5
    `;
    
    const testResult = await pool.query(testQuery);
    console.log(`✅ Query successful, found ${testResult.rows.length} devices (showing first 5)`);
    if (testResult.rows.length > 0) {
      console.log('   Sample device:', {
        id: testResult.rows[0].id,
        name: testResult.rows[0].name,
        status: testResult.rows[0].status
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

checkData();

