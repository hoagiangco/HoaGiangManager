import { Pool } from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file explicitly (not .env.local or .env.production)
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Local database connection (from .env)
const localDatabaseUrl = process.env.DATABASE_URL;

if (!localDatabaseUrl) {
  console.error('❌ Error: DATABASE_URL not found in .env file!');
  console.error('Please ensure .env file contains DATABASE_URL pointing to localhost database');
  process.exit(1);
}

console.log('📝 Local DATABASE_URL:', localDatabaseUrl.replace(/:[^:@]+@/, ':****@'));

const localPool = new Pool({
  connectionString: localDatabaseUrl,
  ssl: false,
});

// Vercel database connection (from command line or .env.production)
const vercelDatabaseUrl = process.env.VERCEL_DATABASE_URL || process.argv[2];

if (!vercelDatabaseUrl) {
  console.error('❌ Error: VERCEL_DATABASE_URL not provided!');
  console.error('Usage: VERCEL_DATABASE_URL=... npm run db:seed-from-local');
  console.error('Or: npm run db:seed-from-local <vercel_database_url>');
  process.exit(1);
}

const vercelPool = new Pool({
  connectionString: vercelDatabaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function seedFromLocal() {
  const localClient = await localPool.connect();
  const vercelClient = await vercelPool.connect();

  try {
    console.log('🔄 Starting data migration from local to Vercel...\n');

    await vercelClient.query('BEGIN');

    // 1. Migrate Departments
    console.log('📦 Migrating Departments...');
    const localDepts = await localClient.query('SELECT * FROM "Department" ORDER BY "ID"');
    console.log(`   Found ${localDepts.rows.length} departments in local database`);
    
    for (const dept of localDepts.rows) {
      await vercelClient.query(
        `INSERT INTO "Department" ("ID", "Name") VALUES ($1, $2)
         ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name"`,
        [dept.ID, dept.Name]
      );
    }
    console.log(`✅ Migrated ${localDepts.rows.length} departments\n`);

    // 2. Migrate DeviceCategories
    console.log('📦 Migrating DeviceCategories...');
    const localCats = await localClient.query('SELECT * FROM "DeviceCategory" ORDER BY "ID"');
    console.log(`   Found ${localCats.rows.length} categories in local database`);
    
    for (const cat of localCats.rows) {
      await vercelClient.query(
        `INSERT INTO "DeviceCategory" ("ID", "Name", "DisplayOrder")
         VALUES ($1, $2, $3)
         ON CONFLICT ("ID") DO UPDATE SET
           "Name" = EXCLUDED."Name",
           "DisplayOrder" = EXCLUDED."DisplayOrder"`,
        [cat.ID, cat.Name, cat.DisplayOrder]
      );
    }
    console.log(`✅ Migrated ${localCats.rows.length} categories\n`);

    // 3. Migrate EventTypes
    console.log('📦 Migrating EventTypes...');
    const localEventTypes = await localClient.query('SELECT * FROM "EventType" ORDER BY "ID"');
    console.log(`   Found ${localEventTypes.rows.length} event types in local database`);
    
    for (const et of localEventTypes.rows) {
      await vercelClient.query(
        `INSERT INTO "EventType" ("ID", "Name")
         VALUES ($1, $2)
         ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name"`,
        [et.ID, et.Name]
      );
    }
    console.log(`✅ Migrated ${localEventTypes.rows.length} event types\n`);

    // 4. Migrate Staff
    console.log('📦 Migrating Staff...');
    const localStaff = await localClient.query('SELECT * FROM "Staff" ORDER BY "ID"');
    console.log(`   Found ${localStaff.rows.length} staff members in local database`);
    
    // Check which UserIds exist in Vercel database
    const vercelUsers = await vercelClient.query('SELECT "Id" FROM "AspNetUsers"');
    const vercelUserIds = new Set(vercelUsers.rows.map((u: any) => u.Id));
    
    for (const staff of localStaff.rows) {
      // Only set UserId if it exists in Vercel database
      let userId = staff.UserId || null;
      if (userId && !vercelUserIds.has(userId)) {
        console.log(`   ⚠️  Staff ${staff.ID} (${staff.Name}) has UserId ${userId} that doesn't exist in Vercel, setting to NULL`);
        userId = null;
      }
      
      await vercelClient.query(
        `INSERT INTO "Staff" ("ID", "Name", "Gender", "Birthday", "DepartmentID", "UserId")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("ID") DO UPDATE SET
           "Name" = EXCLUDED."Name",
           "Gender" = EXCLUDED."Gender",
           "Birthday" = EXCLUDED."Birthday",
           "DepartmentID" = EXCLUDED."DepartmentID",
           "UserId" = EXCLUDED."UserId"`,
        [staff.ID, staff.Name, staff.Gender, staff.Birthday, staff.DepartmentID, userId]
      );
    }
    console.log(`✅ Migrated ${localStaff.rows.length} staff members\n`);

    // 5. Migrate Devices
    console.log('📦 Migrating Devices...');
    const localDevices = await localClient.query('SELECT * FROM "Device" ORDER BY "ID"');
    console.log(`   Found ${localDevices.rows.length} devices in local database`);
    
    for (const device of localDevices.rows) {
      await vercelClient.query(
        `INSERT INTO "Device" ("ID", "Name", "Serial", "Description", "Img", "WarrantyDate", "UseDate", "EndDate", "DepartmentID", "DeviceCategoryID", "Status")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("ID") DO UPDATE SET
           "Name" = EXCLUDED."Name",
           "Serial" = EXCLUDED."Serial",
           "Description" = EXCLUDED."Description",
           "Img" = EXCLUDED."Img",
           "WarrantyDate" = EXCLUDED."WarrantyDate",
           "UseDate" = EXCLUDED."UseDate",
           "EndDate" = EXCLUDED."EndDate",
           "DepartmentID" = EXCLUDED."DepartmentID",
           "DeviceCategoryID" = EXCLUDED."DeviceCategoryID",
           "Status" = EXCLUDED."Status"`,
        [
          device.ID,
          device.Name,
          device.Serial,
          device.Description,
          device.Img,
          device.WarrantyDate,
          device.UseDate,
          device.EndDate,
          device.DepartmentID,
          device.DeviceCategoryID,
          device.Status
        ]
      );
    }
    console.log(`✅ Migrated ${localDevices.rows.length} devices\n`);

    // 6. Migrate Events
    console.log('📦 Migrating Events...');
    const localEvents = await localClient.query('SELECT * FROM "Event" ORDER BY "ID"');
    console.log(`   Found ${localEvents.rows.length} events in local database`);
    
    for (const event of localEvents.rows) {
      // Handle Description field - use Notes if Description is null
      const description = event.Description || event.Notes || '';
      
      await vercelClient.query(
        `INSERT INTO "Event" ("ID", "EventTypeID", "DeviceID", "StaffID", "StartDate", "FinishDate", "Notes", "Img", "NewDeviceStatus", "Description")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT ("ID") DO UPDATE SET
           "EventTypeID" = EXCLUDED."EventTypeID",
           "DeviceID" = EXCLUDED."DeviceID",
           "StaffID" = EXCLUDED."StaffID",
           "StartDate" = EXCLUDED."StartDate",
           "FinishDate" = EXCLUDED."FinishDate",
           "Notes" = EXCLUDED."Notes",
           "Img" = EXCLUDED."Img",
           "NewDeviceStatus" = EXCLUDED."NewDeviceStatus",
           "Description" = EXCLUDED."Description"`,
        [
          event.ID,
          event.EventTypeID,
          event.DeviceID,
          event.StaffID,
          event.StartDate,
          event.FinishDate,
          event.Notes || '',
          event.Img,
          event.NewDeviceStatus,
          description
        ]
      );
    }
    console.log(`✅ Migrated ${localEvents.rows.length} events\n`);

    // 7. Migrate DamageReports (if exists)
    try {
      console.log('📦 Migrating DamageReports...');
      const localReports = await localClient.query('SELECT * FROM "DamageReport" ORDER BY "ID"');
      console.log(`   Found ${localReports.rows.length} damage reports in local database`);
      
      for (const report of localReports.rows) {
        await vercelClient.query(
          `INSERT INTO "DamageReport" (
            "ID", "DeviceID", "ReporterID", "HandlerID", "ReportingDepartmentID",
            "Priority", "Status", "ReportDate", "DamageContent", "HandlerNotes",
            "CompletedDate", "UpdatedBy", "UpdatedAt", "Images", "DamageLocation",
            "AssignedDate", "HandlingDate", "EstimatedCompletionDate", "Notes",
            "RejectionReason", "CreatedBy", "CreatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT ("ID") DO UPDATE SET
            "DeviceID" = EXCLUDED."DeviceID",
            "ReporterID" = EXCLUDED."ReporterID",
            "HandlerID" = EXCLUDED."HandlerID",
            "ReportingDepartmentID" = EXCLUDED."ReportingDepartmentID",
            "Priority" = EXCLUDED."Priority",
            "Status" = EXCLUDED."Status",
            "ReportDate" = EXCLUDED."ReportDate",
            "DamageContent" = EXCLUDED."DamageContent",
            "HandlerNotes" = EXCLUDED."HandlerNotes",
            "CompletedDate" = EXCLUDED."CompletedDate",
            "UpdatedBy" = EXCLUDED."UpdatedBy",
            "UpdatedAt" = EXCLUDED."UpdatedAt",
            "Images" = EXCLUDED."Images",
            "DamageLocation" = EXCLUDED."DamageLocation",
            "AssignedDate" = EXCLUDED."AssignedDate",
            "HandlingDate" = EXCLUDED."HandlingDate",
            "EstimatedCompletionDate" = EXCLUDED."EstimatedCompletionDate",
            "Notes" = EXCLUDED."Notes",
            "RejectionReason" = EXCLUDED."RejectionReason",
            "CreatedBy" = EXCLUDED."CreatedBy",
            "CreatedAt" = EXCLUDED."CreatedAt"`,
          [
            report.ID,
            report.DeviceID,
            report.ReporterID,
            report.HandlerID,
            report.ReportingDepartmentID,
            report.Priority,
            report.Status,
            report.ReportDate,
            report.DamageContent,
            report.HandlerNotes,
            report.CompletedDate,
            report.UpdatedBy,
            report.UpdatedAt,
            report.Images ? (typeof report.Images === 'string' ? report.Images : JSON.stringify(report.Images)) : null,
            report.DamageLocation,
            report.AssignedDate,
            report.HandlingDate,
            report.EstimatedCompletionDate,
            report.Notes,
            report.RejectionReason,
            report.CreatedBy,
            report.CreatedAt
          ]
        );
      }
      console.log(`✅ Migrated ${localReports.rows.length} damage reports\n`);
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  DamageReport table not found in local database (skipping)\n');
      } else {
        throw error;
      }
    }

    // 8. Migrate DamageReportHistory (if exists)
    try {
      console.log('📦 Migrating DamageReportHistory...');
      const localHistory = await localClient.query('SELECT * FROM "DamageReportHistory" ORDER BY "ID"');
      console.log(`   Found ${localHistory.rows.length} history records in local database`);
      
      for (const history of localHistory.rows) {
        await vercelClient.query(
          `INSERT INTO "DamageReportHistory" (
            "ID", "DamageReportID", "ChangedBy", "ChangedAt", "FieldName",
            "OldValue", "NewValue"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT ("ID") DO UPDATE SET
            "DamageReportID" = EXCLUDED."DamageReportID",
            "ChangedBy" = EXCLUDED."ChangedBy",
            "ChangedAt" = EXCLUDED."ChangedAt",
            "FieldName" = EXCLUDED."FieldName",
            "OldValue" = EXCLUDED."OldValue",
            "NewValue" = EXCLUDED."NewValue"`,
          [
            history.ID,
            history.DamageReportID,
            history.ChangedBy || '',
            history.ChangedAt,
            history.FieldName,
            history.OldValue,
            history.NewValue
          ]
        );
      }
      console.log(`✅ Migrated ${localHistory.rows.length} damage report history records\n`);
    } catch (error: any) {
      if (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('table')) {
        console.log(`⚠️  DamageReportHistory: ${error.message} (skipping)\n`);
      } else {
        console.error('❌ Error migrating DamageReportHistory:', error.message);
        throw error;
      }
    }

    await vercelClient.query('COMMIT');

    console.log('✅ Migration completed successfully!\n');

    // Summary
    const vercelDeptCount = await vercelClient.query('SELECT COUNT(*) as count FROM "Department"');
    const vercelCatCount = await vercelClient.query('SELECT COUNT(*) as count FROM "DeviceCategory"');
    const vercelStaffCount = await vercelClient.query('SELECT COUNT(*) as count FROM "Staff"');
    const vercelDeviceCount = await vercelClient.query('SELECT COUNT(*) as count FROM "Device"');
    const vercelEventCount = await vercelClient.query('SELECT COUNT(*) as count FROM "Event"');
    const vercelEventTypeCount = await vercelClient.query('SELECT COUNT(*) as count FROM "EventType"');
    
    let vercelReportCount = 0;
    let vercelHistoryCount = 0;
    try {
      const vercelReportResult = await vercelClient.query('SELECT COUNT(*) as count FROM "DamageReport"');
      vercelReportCount = vercelReportResult.rows[0].count;
    } catch {}
    
    try {
      const vercelHistoryResult = await vercelClient.query('SELECT COUNT(*) as count FROM "DamageReportHistory"');
      vercelHistoryCount = vercelHistoryResult.rows[0].count;
    } catch {}

    console.log('📊 Vercel Database Summary:');
    console.log(`   Departments: ${vercelDeptCount.rows[0].count}`);
    console.log(`   DeviceCategories: ${vercelCatCount.rows[0].count}`);
    console.log(`   Staff: ${vercelStaffCount.rows[0].count}`);
    console.log(`   Devices: ${vercelDeviceCount.rows[0].count}`);
    console.log(`   Events: ${vercelEventCount.rows[0].count}`);
    console.log(`   EventTypes: ${vercelEventTypeCount.rows[0].count}`);
    console.log(`   DamageReports: ${vercelReportCount}`);
    console.log(`   DamageReportHistory: ${vercelHistoryCount}\n`);

  } catch (error: any) {
    await vercelClient.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    localClient.release();
    vercelClient.release();
    await localPool.end();
    await vercelPool.end();
  }
}

seedFromLocal()
  .then(() => {
    console.log('✅ Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  });

