-- Migration: Add AfterImages to DamageReport
-- Date: 2026-03-31

ALTER TABLE "DamageReport" ADD COLUMN IF NOT EXISTS "AfterImages" JSONB;

COMMENT ON COLUMN "DamageReport"."AfterImages" IS 'Mảng đường dẫn hình ảnh sau khi xử lý (thực hiện xong công việc)';
