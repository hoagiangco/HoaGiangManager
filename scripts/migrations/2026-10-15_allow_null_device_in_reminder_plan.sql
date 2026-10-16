-- Allow DeviceID to be NULL in DeviceReminderPlan for recurring task schedules without devices
ALTER TABLE "DeviceReminderPlan" ALTER COLUMN "DeviceID" DROP NOT NULL;
