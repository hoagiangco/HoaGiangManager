-- Create Location table for professional asset tracking
CREATE TABLE IF NOT EXISTS "Location" (
    "ID" SERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL UNIQUE
);

-- Add LocationID to Device table
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "LocationID" INTEGER;

-- Add Foreign Key constraint
-- Use DO block to avoid error if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_device_location'
    ) THEN
        ALTER TABLE "Device" 
        ADD CONSTRAINT fk_device_location 
        FOREIGN KEY ("LocationID") REFERENCES "Location" ("ID") 
        ON DELETE SET NULL;
    END IF;
END $$;
