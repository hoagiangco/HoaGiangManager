CREATE TABLE IF NOT EXISTS public."SupplierCategory" (
    "ID" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bỏ cột Type cũ, thêm cột CategoryID
ALTER TABLE public."Supplier" DROP COLUMN IF EXISTS "Type";
ALTER TABLE public."Supplier" ADD COLUMN IF NOT EXISTS "CategoryID" INTEGER;

-- Thêm khóa ngoại
ALTER TABLE public."Supplier" 
  ADD CONSTRAINT "fk_supplier_category" 
  FOREIGN KEY ("CategoryID") 
  REFERENCES public."SupplierCategory" ("ID") 
  ON DELETE SET NULL;
