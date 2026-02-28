-- Update DamageReport check constraint to allow MaintenanceBatchId
-- Drop the old constraint
ALTER TABLE "DamageReport" 
DROP CONSTRAINT IF EXISTS "DamageReport_check2";

-- Add new constraint that allows DeviceID, DamageLocation, or MaintenanceBatchId
ALTER TABLE "DamageReport" 
ADD CONSTRAINT "DamageReport_check2" 
CHECK (
  ("DeviceID" IS NOT NULL) 
  OR ("DamageLocation" IS NOT NULL AND "DamageLocation" != '') 
  OR ("MaintenanceBatchId" IS NOT NULL AND "MaintenanceBatchId" != '')
);


