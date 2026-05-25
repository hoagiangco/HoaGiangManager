SELECT dr."ID", plan."Title" as plan_title 
FROM "DamageReport" dr 
LEFT JOIN "DeviceReminderPlan" plan ON plan."Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" 
WHERE dr."MaintenanceBatchId" IS NOT NULL;
