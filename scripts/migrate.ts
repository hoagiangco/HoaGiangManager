import pool from '../lib/db/index';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create extension for UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create AspNetRoles table (Identity roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetRoles" (
        "Id" TEXT PRIMARY KEY,
        "Name" VARCHAR(256),
        "NormalizedName" VARCHAR(256),
        "ConcurrencyStamp" TEXT,
        UNIQUE("NormalizedName")
      )
    `);

    // Create AspNetUsers table (Identity users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetUsers" (
        "Id" TEXT PRIMARY KEY,
        "UserName" VARCHAR(256),
        "NormalizedUserName" VARCHAR(256),
        "Email" VARCHAR(256),
        "NormalizedEmail" VARCHAR(256),
        "EmailConfirmed" BOOLEAN DEFAULT FALSE,
        "PasswordHash" TEXT,
        "SecurityStamp" TEXT,
        "ConcurrencyStamp" TEXT,
        "PhoneNumber" TEXT,
        "PhoneNumberConfirmed" BOOLEAN DEFAULT FALSE,
        "TwoFactorEnabled" BOOLEAN DEFAULT FALSE,
        "LockoutEnd" TIMESTAMP,
        "LockoutEnabled" BOOLEAN DEFAULT FALSE,
        "AccessFailedCount" INTEGER DEFAULT 0,
        "FullName" VARCHAR(256),
        "CreatedDate" TIMESTAMP,
        UNIQUE("NormalizedUserName"),
        UNIQUE("NormalizedEmail")
      )
    `);

    // Create AspNetUserRoles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetUserRoles" (
        "UserId" TEXT NOT NULL,
        "RoleId" TEXT NOT NULL,
        PRIMARY KEY ("UserId", "RoleId"),
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE,
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE
      )
    `);

    // Create AspNetUserClaims table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetUserClaims" (
        "Id" SERIAL PRIMARY KEY,
        "UserId" TEXT NOT NULL,
        "ClaimType" TEXT,
        "ClaimValue" TEXT,
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
      )
    `);

    // Create AspNetUserLogins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetUserLogins" (
        "LoginProvider" TEXT NOT NULL,
        "ProviderKey" TEXT NOT NULL,
        "ProviderDisplayName" TEXT,
        "UserId" TEXT NOT NULL,
        PRIMARY KEY ("LoginProvider", "ProviderKey"),
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
      )
    `);

    // Create AspNetRoleClaims table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetRoleClaims" (
        "Id" SERIAL PRIMARY KEY,
        "RoleId" TEXT NOT NULL,
        "ClaimType" TEXT,
        "ClaimValue" TEXT,
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE
      )
    `);

    // Create AspNetUserTokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AspNetUserTokens" (
        "UserId" TEXT NOT NULL,
        "LoginProvider" TEXT NOT NULL,
        "Name" TEXT NOT NULL,
        "Value" TEXT,
        PRIMARY KEY ("UserId", "LoginProvider", "Name"),
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
      )
    `);

    // Create Department table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Department" (
        "ID" SMALLINT PRIMARY KEY,
        "Name" VARCHAR(50)
      )
    `);

    // Create DeviceCategory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DeviceCategory" (
        "ID" SMALLINT PRIMARY KEY,
        "Name" VARCHAR(50),
        "DisplayOrder" INTEGER
      )
    `);

    // Create DeviceStatus enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE device_status AS ENUM ('1', '2', '3', '4');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create Device table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Device" (
        "ID" SERIAL PRIMARY KEY,
        "Name" VARCHAR(100),
        "Serial" VARCHAR(20),
        "Description" TEXT,
        "Img" TEXT,
        "WarrantyDate" DATE,
        "UseDate" DATE,
        "EndDate" DATE,
        "DepartmentID" SMALLINT NOT NULL,
        "DeviceCategoryID" SMALLINT NOT NULL,
        "Status" device_status DEFAULT '1',
        FOREIGN KEY ("DepartmentID") REFERENCES "Department"("ID"),
        FOREIGN KEY ("DeviceCategoryID") REFERENCES "DeviceCategory"("ID")
      )
    `);

    // Create Staff table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Staff" (
        "ID" SMALLINT PRIMARY KEY,
        "Name" VARCHAR(50),
        "Gender" BOOLEAN,
        "Birthday" DATE,
        "DepartmentID" SMALLINT,
        "UserId" TEXT,
        FOREIGN KEY ("DepartmentID") REFERENCES "Department"("ID"),
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE SET NULL,
        UNIQUE("UserId")
      )
    `);
    
    // Add UserId column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Staff' AND column_name = 'UserId'
        ) THEN
          ALTER TABLE "Staff" ADD COLUMN "UserId" TEXT;
          ALTER TABLE "Staff" ADD CONSTRAINT "Staff_UserId_fkey" 
            FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE SET NULL;
          ALTER TABLE "Staff" ADD CONSTRAINT "Staff_UserId_unique" UNIQUE("UserId");
        END IF;
      END $$;
    `);

    // Create EventType table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "EventType" (
        "ID" SMALLINT PRIMARY KEY,
        "Name" VARCHAR(50)
      )
    `);

    // Create Event table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Event" (
        "ID" SERIAL PRIMARY KEY,
        "Name" VARCHAR(200),
        "DeviceID" INTEGER,
        "EventTypeID" SMALLINT,
        "Description" TEXT NOT NULL,
        "Img" TEXT,
        "StartDate" DATE,
        "FinishDate" DATE NOT NULL,
        "StaffID" SMALLINT,
        "Notes" VARCHAR(200) NOT NULL,
        "NewDeviceStatus" device_status,
        FOREIGN KEY ("DeviceID") REFERENCES "Device"("ID"),
        FOREIGN KEY ("EventTypeID") REFERENCES "EventType"("ID"),
        FOREIGN KEY ("StaffID") REFERENCES "Staff"("ID")
      )
    `);

    // Create DamageReportStatus enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE damage_report_status AS ENUM ('1', '2', '3', '4', '5', '6');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create DamageReportPriority enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE damage_report_priority AS ENUM ('1', '2', '3', '4');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create DamageReport table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DamageReport" (
        "ID" SERIAL PRIMARY KEY,
        "DeviceID" INTEGER,
        "DamageLocation" VARCHAR(200),
        "ReporterID" SMALLINT NOT NULL,
        "ReportingDepartmentID" SMALLINT NOT NULL,
        "HandlerID" SMALLINT,
        "AssignedDate" DATE,
        "ReportDate" DATE NOT NULL DEFAULT CURRENT_DATE,
        "HandlingDate" DATE,
        "CompletedDate" DATE,
        "EstimatedCompletionDate" DATE,
        "DamageContent" TEXT NOT NULL,
        "Images" JSONB,
        "Status" damage_report_status NOT NULL DEFAULT '1',
        "Priority" damage_report_priority NOT NULL DEFAULT '2',
        "Notes" TEXT,
        "HandlerNotes" TEXT,
        "RejectionReason" TEXT,
        "CreatedBy" TEXT,
        "UpdatedBy" TEXT,
        "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("DeviceID") REFERENCES "Device"("ID") ON DELETE SET NULL,
        FOREIGN KEY ("ReporterID") REFERENCES "Staff"("ID"),
        FOREIGN KEY ("ReportingDepartmentID") REFERENCES "Department"("ID"),
        FOREIGN KEY ("HandlerID") REFERENCES "Staff"("ID"),
        CHECK ("ReportDate" <= COALESCE("HandlingDate", CURRENT_DATE)),
        CHECK ("HandlingDate" IS NULL OR "HandlingDate" <= COALESCE("CompletedDate", CURRENT_DATE)),
        CHECK (("DeviceID" IS NOT NULL) OR ("DamageLocation" IS NOT NULL AND "DamageLocation" != ''))
      )
    `);

    // Create DamageReportHistory table for tracking changes
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DamageReportHistory" (
        "ID" SERIAL PRIMARY KEY,
        "DamageReportID" INTEGER NOT NULL,
        "FieldName" VARCHAR(50) NOT NULL,
        "OldValue" TEXT,
        "NewValue" TEXT,
        "ChangedBy" TEXT NOT NULL,
        "ChangedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("DamageReportID") REFERENCES "DamageReport"("ID") ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_damage_report_history_report ON "DamageReportHistory"("DamageReportID");
      CREATE INDEX IF NOT EXISTS idx_damage_report_history_date ON "DamageReportHistory"("ChangedAt");
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_aspnet_users_email ON "AspNetUsers"("NormalizedEmail");
      CREATE INDEX IF NOT EXISTS idx_aspnet_users_username ON "AspNetUsers"("NormalizedUserName");
      CREATE INDEX IF NOT EXISTS idx_device_category ON "Device"("DeviceCategoryID");
      CREATE INDEX IF NOT EXISTS idx_device_department ON "Device"("DepartmentID");
      CREATE INDEX IF NOT EXISTS idx_event_device ON "Event"("DeviceID");
      CREATE INDEX IF NOT EXISTS idx_staff_department ON "Staff"("DepartmentID");
      CREATE INDEX IF NOT EXISTS idx_damage_report_device ON "DamageReport"("DeviceID");
      CREATE INDEX IF NOT EXISTS idx_damage_report_reporter ON "DamageReport"("ReporterID");
      CREATE INDEX IF NOT EXISTS idx_damage_report_handler ON "DamageReport"("HandlerID");
      CREATE INDEX IF NOT EXISTS idx_damage_report_status ON "DamageReport"("Status");
      CREATE INDEX IF NOT EXISTS idx_damage_report_date ON "DamageReport"("ReportDate");
      CREATE INDEX IF NOT EXISTS idx_damage_report_department ON "DamageReport"("ReportingDepartmentID");
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });

