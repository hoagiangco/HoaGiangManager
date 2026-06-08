CREATE TABLE IF NOT EXISTS public."SupplierCategoryMapping" (
    "SupplierID" INTEGER NOT NULL,
    "CategoryID" INTEGER NOT NULL,
    PRIMARY KEY ("SupplierID", "CategoryID"),
    FOREIGN KEY ("SupplierID") REFERENCES public."Supplier" ("ID") ON DELETE CASCADE,
    FOREIGN KEY ("CategoryID") REFERENCES public."SupplierCategory" ("ID") ON DELETE CASCADE
);

-- Migrate existing data (if any)
INSERT INTO public."SupplierCategoryMapping" ("SupplierID", "CategoryID")
SELECT "ID", "CategoryID" FROM public."Supplier" WHERE "CategoryID" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the old column
ALTER TABLE public."Supplier" DROP COLUMN IF EXISTS "CategoryID";
