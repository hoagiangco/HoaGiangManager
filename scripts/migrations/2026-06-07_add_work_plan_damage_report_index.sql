CREATE INDEX IF NOT EXISTS idx_work_plan_item_damage_report
ON "WorkPlanItem"("DamageReportID")
WHERE "DamageReportID" IS NOT NULL;
