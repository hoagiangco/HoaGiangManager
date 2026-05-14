-- Migration to create WorkPlanItem table
-- Date: 2026-05-14

CREATE TABLE IF NOT EXISTS "WorkPlanItem" (
    "ID" SERIAL PRIMARY KEY,
    "PlanDate" DATE NOT NULL,
    "StaffID" SMALLINT NOT NULL,
    "DamageReportID" INTEGER, -- Link to existing report OR created report
    "IsNewTask" BOOLEAN DEFAULT FALSE, -- Flag if created as a new draft in plan
    "Title" VARCHAR(200) NOT NULL,
    "DraftData" JSONB, -- Stores { deviceId, location, content, priority, images, reporterId, reportingDepartmentId }
    "IsImplemented" BOOLEAN DEFAULT FALSE, -- Flag if confirmed/implemented
    "CreatedBy" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("StaffID") REFERENCES "Staff"("ID") ON DELETE CASCADE,
    FOREIGN KEY ("DamageReportID") REFERENCES "DamageReport"("ID") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_work_plan_item_date ON "WorkPlanItem"("PlanDate");
CREATE INDEX IF NOT EXISTS idx_work_plan_item_staff ON "WorkPlanItem"("StaffID");
