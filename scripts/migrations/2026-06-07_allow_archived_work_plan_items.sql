-- Cho phép kế hoạch nằm trong kho lưu trữ mà chưa gán ngày áp dụng.

ALTER TABLE "WorkPlanItem"
  ALTER COLUMN "PlanDate" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_plan_item_archive
  ON "WorkPlanItem"("StaffID", "CreatedAt")
  WHERE "PlanDate" IS NULL AND "IsImplemented" = false;
