-- Add ParentID to Location table for hierarchical locations
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "ParentID" INTEGER;

-- Add Foreign Key constraint for ParentID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_location_parent'
    ) THEN
        ALTER TABLE "Location" 
        ADD CONSTRAINT fk_location_parent 
        FOREIGN KEY ("ParentID") REFERENCES "Location" ("ID") 
        ON DELETE SET NULL;
    END IF;
END $$;
