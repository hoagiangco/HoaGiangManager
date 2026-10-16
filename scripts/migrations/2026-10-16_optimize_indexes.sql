-- Migration: Add missing database indexes for performance optimization
-- Date: 2026-10-16

-- 1. SparePartTransaction indexes (FK lookups, date sorting, and debounce checks)
CREATE INDEX IF NOT EXISTS "idx_spare_part_tx_spare_part_id" 
    ON public."SparePartTransaction"("SparePartID");

CREATE INDEX IF NOT EXISTS "idx_spare_part_tx_date" 
    ON public."SparePartTransaction"("TransactionDate" DESC);

CREATE INDEX IF NOT EXISTS "idx_spare_part_tx_report_id" 
    ON public."SparePartTransaction"("RelatedReportID") 
    WHERE "RelatedReportID" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_spare_part_tx_created_by" 
    ON public."SparePartTransaction"("CreatedBy");

-- 2. DamageReport compound indexes for status filtering and list queries
CREATE INDEX IF NOT EXISTS "idx_damage_report_device_status" 
    ON public."DamageReport"("DeviceID", "Status");

CREATE INDEX IF NOT EXISTS "idx_damage_report_handler_status" 
    ON public."DamageReport"("HandlerID", "Status");

CREATE INDEX IF NOT EXISTS "idx_damage_report_batch" 
    ON public."DamageReport"("MaintenanceBatchId") 
    WHERE "MaintenanceBatchId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_damage_report_active" 
    ON public."DamageReport"("ID") 
    WHERE "IsDeleted" = false OR "IsDeleted" IS NULL;

-- 3. Event indexes for calendar date ranges and event types
CREATE INDEX IF NOT EXISTS "idx_event_dates" 
    ON public."Event"("EventDate", "StartDate", "EndDate");

CREATE INDEX IF NOT EXISTS "idx_event_type" 
    ON public."Event"("EventTypeID");

-- 4. AuditLogs indexes for log querying and sorting
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" 
    ON "AuditLogs"("CreatedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" 
    ON "AuditLogs"("Action");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_table_name" 
    ON "AuditLogs"("TableName");
