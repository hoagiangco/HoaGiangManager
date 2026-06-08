ALTER TABLE public."Device" ADD COLUMN IF NOT EXISTS "SupplierID" INTEGER;

-- Create an index for the foreign key to improve query performance
CREATE INDEX IF NOT EXISTS "IX_Device_SupplierID" ON public."Device" ("SupplierID");

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_device_supplier'
    ) THEN
        ALTER TABLE public."Device" 
        ADD CONSTRAINT fk_device_supplier 
        FOREIGN KEY ("SupplierID") 
        REFERENCES public."Supplier"("ID") 
        ON DELETE SET NULL;
    END IF;
END $$;
