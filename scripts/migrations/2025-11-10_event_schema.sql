BEGIN;

-- Normalize Event table
ALTER TABLE "Event" RENAME COLUMN "Name" TO "Title";
ALTER TABLE "Event" RENAME COLUMN "FinishDate" TO "EndDate";

-- Drop legacy columns no longer in use
ALTER TABLE "Event" DROP COLUMN IF EXISTS "Img";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "NewDeviceStatus";

-- Add lifecycle columns
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "Status" VARCHAR(32) DEFAULT 'completed';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "EventDate" TIMESTAMP NULL;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "RelatedReportID" INTEGER NULL REFERENCES "DamageReport"("ID") ON DELETE SET NULL;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "Metadata" JSONB;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "CreatedBy" VARCHAR(450);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "CreatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "UpdatedBy" VARCHAR(450);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "UpdatedAt" TIMESTAMPTZ;

UPDATE "Event" SET "Status" = COALESCE("Status", 'completed');
UPDATE "Event" SET "CreatedAt" = COALESCE("CreatedAt", CURRENT_TIMESTAMP);
UPDATE "Event" SET "UpdatedAt" = COALESCE("UpdatedAt", "CreatedAt", CURRENT_TIMESTAMP);

ALTER TABLE "Event" ALTER COLUMN "Status" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_event_status ON "Event"("Status");
CREATE INDEX IF NOT EXISTS idx_event_related_report ON "Event"("RelatedReportID");
CREATE INDEX IF NOT EXISTS idx_event_device ON "Event"("DeviceID");

-- Extend EventType metadata
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "Code" VARCHAR(50);
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "Description" TEXT;
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "Category" VARCHAR(50);
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "Color" VARCHAR(20);
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "IsReminder" BOOLEAN DEFAULT FALSE;
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "DefaultStatus" VARCHAR(32) DEFAULT 'planned';
ALTER TABLE "EventType" ADD COLUMN IF NOT EXISTS "DefaultLeadTimeDays" INTEGER;

UPDATE "EventType" SET "DefaultStatus" = COALESCE("DefaultStatus", 'planned');

ALTER TABLE "EventType" ALTER COLUMN "IsReminder" SET DEFAULT FALSE;
ALTER TABLE "EventType" ALTER COLUMN "DefaultStatus" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_eventtype_code ON "EventType"("Code") WHERE "Code" IS NOT NULL;

-- Create reminder plan table
CREATE TABLE IF NOT EXISTS "DeviceReminderPlan" (
  "ID" SERIAL PRIMARY KEY,
  "DeviceID" INTEGER NOT NULL REFERENCES "Device"("ID") ON DELETE CASCADE,
  "ReminderType" VARCHAR(50) NOT NULL,
  "EventTypeID" INTEGER REFERENCES "EventType"("ID") ON DELETE SET NULL,
  "Title" VARCHAR(150),
  "Description" TEXT,
  "IntervalValue" INTEGER,
  "IntervalUnit" VARCHAR(10),
  "CronExpression" VARCHAR(120),
  "StartFrom" TIMESTAMP,
  "EndAt" TIMESTAMP,
  "NextDueDate" TIMESTAMP,
  "LastTriggeredAt" TIMESTAMP,
  "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "Metadata" JSONB,
  "CreatedBy" VARCHAR(450),
  "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedBy" VARCHAR(450),
  "UpdatedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_device_reminder_plan_device ON "DeviceReminderPlan"("DeviceID");
CREATE INDEX IF NOT EXISTS idx_device_reminder_plan_active_due ON "DeviceReminderPlan"("NextDueDate") WHERE "IsActive" IS TRUE;

COMMIT;

