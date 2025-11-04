import sql from 'mssql';
import pool from '../lib/db/index';
import dotenv from 'dotenv';

dotenv.config();

// SQL Server connection config
const sqlServerConfig = {
  server: 'HOAGIANG-IT\\MSSQL2017',
  database: 'QuanLyVatTu',
  user: 'sa',
  password: 'Lhkhiem_1990',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function migrateData() {
  let sqlPool: sql.ConnectionPool | null = null;

  try {
    console.log('🔍 Connecting to SQL Server...');
    sqlPool = await sql.connect(sqlServerConfig);
    console.log('✅ Connected to SQL Server\n');

    // Migrate Departments
    console.log('📦 Migrating Departments...');
    const departments = await sqlPool.request().query('SELECT * FROM Department ORDER BY ID');
    console.log(`   Found ${departments.recordset.length} departments`);
    
    for (const dept of departments.recordset) {
      await pool.query(
        `INSERT INTO "Department" ("ID", "Name") VALUES ($1, $2) 
         ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name"`,
        [dept.ID, dept.Name]
      );
    }
    console.log('✅ Departments migrated\n');

    // Migrate DeviceCategories
    console.log('📦 Migrating DeviceCategories...');
    const categories = await sqlPool.request().query('SELECT * FROM DeviceCategory ORDER BY ID');
    console.log(`   Found ${categories.recordset.length} categories`);
    
    for (const cat of categories.recordset) {
      await pool.query(
        `INSERT INTO "DeviceCategory" ("ID", "Name", "DisplayOrder") 
         VALUES ($1, $2, $3) 
         ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name", "DisplayOrder" = EXCLUDED."DisplayOrder"`,
        [cat.ID, cat.Name, cat.DisplayOrder || null]
      );
    }
    console.log('✅ DeviceCategories migrated\n');

    // Migrate EventTypes
    console.log('📦 Migrating EventTypes...');
    const eventTypes = await sqlPool.request().query('SELECT * FROM EventType ORDER BY ID');
    console.log(`   Found ${eventTypes.recordset.length} event types`);
    
    for (const et of eventTypes.recordset) {
      await pool.query(
        `INSERT INTO "EventType" ("ID", "Name") 
         VALUES ($1, $2) 
         ON CONFLICT ("ID") DO UPDATE SET "Name" = EXCLUDED."Name"`,
        [et.ID, et.Name]
      );
    }
    console.log('✅ EventTypes migrated\n');

    // Migrate Staff
    console.log('📦 Migrating Staff...');
    const staff = await sqlPool.request().query('SELECT * FROM Staff ORDER BY ID');
    console.log(`   Found ${staff.recordset.length} staff members`);
    
    for (const s of staff.recordset) {
      await pool.query(
        `INSERT INTO "Staff" ("ID", "Name", "Gender", "Birthday", "DepartmentID") 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT ("ID") DO UPDATE SET 
           "Name" = EXCLUDED."Name", 
           "Gender" = EXCLUDED."Gender", 
           "Birthday" = EXCLUDED."Birthday", 
           "DepartmentID" = EXCLUDED."DepartmentID"`,
        [s.ID, s.Name, s.Gender, s.Birthday, s.DepartmentID]
      );
    }
    console.log('✅ Staff migrated\n');

    // Migrate Devices
    console.log('📦 Migrating Devices...');
    const devices = await sqlPool.request().query('SELECT * FROM Device ORDER BY ID');
    console.log(`   Found ${devices.recordset.length} devices`);
    
    for (const dev of devices.recordset) {
      await pool.query(
        `INSERT INTO "Device" (
          "ID", "Name", "Serial", "Description", "Img", 
          "WarrantyDate", "UseDate", "EndDate", 
          "DepartmentID", "DeviceCategoryID", "Status"
        ) 
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
          dev.ID,
          dev.Name,
          dev.Serial,
          dev.Description,
          dev.Img,
          dev.WarrantyDate,
          dev.UseDate,
          dev.EndDate,
          dev.DepartmentID,
          dev.DeviceCategoryID,
          dev.Status ? dev.Status.toString() : '1'
        ]
      );
    }
    console.log('✅ Devices migrated\n');

    // Migrate Events
    console.log('📦 Migrating Events...');
    const events = await sqlPool.request().query('SELECT * FROM Event ORDER BY ID');
    console.log(`   Found ${events.recordset.length} events`);
    
    for (const evt of events.recordset) {
      await pool.query(
        `INSERT INTO "Event" (
          "ID", "Name", "DeviceID", "EventTypeID", "Description", 
          "Img", "StartDate", "FinishDate", "StaffID", "Notes", "NewDeviceStatus"
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        ON CONFLICT ("ID") DO UPDATE SET
          "Name" = EXCLUDED."Name",
          "DeviceID" = EXCLUDED."DeviceID",
          "EventTypeID" = EXCLUDED."EventTypeID",
          "Description" = EXCLUDED."Description",
          "Img" = EXCLUDED."Img",
          "StartDate" = EXCLUDED."StartDate",
          "FinishDate" = EXCLUDED."FinishDate",
          "StaffID" = EXCLUDED."StaffID",
          "Notes" = EXCLUDED."Notes",
          "NewDeviceStatus" = EXCLUDED."NewDeviceStatus"`,
        [
          evt.ID,
          evt.Name,
          evt.DeviceID,
          evt.EventTypeID,
          evt.Description,
          evt.Img,
          evt.StartDate,
          evt.FinishDate,
          evt.StaffID,
          evt.Notes,
          evt.NewDeviceStatus ? evt.NewDeviceStatus.toString() : null
        ]
      );
    }
    console.log('✅ Events migrated\n');

    // Migrate Users (AspNetUsers)
    console.log('📦 Migrating Users...');
    const users = await sqlPool.request().query(`
      SELECT u.*, 
        STRING_AGG(r.Name, ',') as Roles
      FROM AspNetUsers u
      LEFT JOIN AspNetUserRoles ur ON u.Id = ur.UserId
      LEFT JOIN AspNetRoles r ON ur.RoleId = r.Id
      GROUP BY u.Id, u.UserName, u.NormalizedUserName, u.Email, u.NormalizedEmail,
               u.EmailConfirmed, u.PasswordHash, u.SecurityStamp, u.ConcurrencyStamp,
               u.PhoneNumber, u.PhoneNumberConfirmed, u.TwoFactorEnabled, u.LockoutEnd,
               u.LockoutEnabled, u.AccessFailedCount, u.FullName, u.CreatedDate
      ORDER BY u.CreatedDate
    `);
    console.log(`   Found ${users.recordset.length} users`);
    
    let usersMigrated = 0;
    let usersSkipped = 0;
    
    for (const user of users.recordset) {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT "Id" FROM "AspNetUsers" WHERE "Id" = $1 OR "NormalizedUserName" = $2',
          [user.Id, user.NormalizedUserName]
        );

        if (existingUser.rows.length > 0) {
          console.log(`   ⏭️  Skipping user ${user.UserName} (already exists)`);
          usersSkipped++;
          continue;
        }

        // Insert user
        await pool.query(
          `INSERT INTO "AspNetUsers" (
            "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
            "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
            "PhoneNumber", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnd",
            "LockoutEnabled", "AccessFailedCount", "FullName", "CreatedDate"
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            user.Id,
            user.UserName,
            user.NormalizedUserName,
            user.Email,
            user.NormalizedEmail,
            user.EmailConfirmed || false,
            user.PasswordHash,
            user.SecurityStamp,
            user.ConcurrencyStamp,
            user.PhoneNumber,
            user.PhoneNumberConfirmed || false,
            user.TwoFactorEnabled || false,
            user.LockoutEnd,
            user.LockoutEnabled || false,
            user.AccessFailedCount || 0,
            user.FullName,
            user.CreatedDate
          ]
        );

        // Migrate user roles
        if (user.Roles) {
          const roleNames = user.Roles.split(',').filter((r: string) => r && r.trim());
          for (const roleName of roleNames) {
            const roleResult = await pool.query(
              'SELECT "Id" FROM "AspNetRoles" WHERE "NormalizedName" = $1',
              [roleName.trim().toUpperCase()]
            );
            
            if (roleResult.rows.length > 0) {
              await pool.query(
                `INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") 
                 VALUES ($1, $2) 
                 ON CONFLICT DO NOTHING`,
                [user.Id, roleResult.rows[0].Id]
              );
            }
          }
        }
        usersMigrated++;
      } catch (error: any) {
        console.error(`   ⚠️  Error migrating user ${user.UserName}:`, error.message);
      }
    }
    console.log(`✅ Users migrated: ${usersMigrated} migrated, ${usersSkipped} skipped\n`);

    console.log('🎉 Data migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Departments: ${departments.recordset.length}`);
    console.log(`   - DeviceCategories: ${categories.recordset.length}`);
    console.log(`   - EventTypes: ${eventTypes.recordset.length}`);
    console.log(`   - Staff: ${staff.recordset.length}`);
    console.log(`   - Devices: ${devices.recordset.length}`);
    console.log(`   - Events: ${events.recordset.length}`);
    console.log(`   - Users: ${users.recordset.length}`);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    throw error;
  } finally {
    if (sqlPool) {
      await sqlPool.close();
      console.log('\n🔌 SQL Server connection closed');
    }
    await pool.end();
    console.log('🔌 PostgreSQL connection closed');
  }
}

migrateData()
  .then(() => {
    console.log('\n✅ Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  });

