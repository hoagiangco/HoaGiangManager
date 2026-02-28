-- Add MaintenanceBatchId column to DamageReport table
ALTER TABLE "DamageReport" 
ADD COLUMN IF NOT EXISTS "MaintenanceBatchId" TEXT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_damage_report_maintenance_batch 
ON "DamageReport"("MaintenanceBatchId") 
WHERE "MaintenanceBatchId" IS NOT NULL;


