CREATE TABLE IF NOT EXISTS public."Supplier" (
    "ID" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Type" VARCHAR(50) NOT NULL, -- Device, Material, Service, Other
    "TaxCode" VARCHAR(50),
    "ContactPerson" VARCHAR(100),
    "Phone" VARCHAR(50),
    "Email" VARCHAR(100),
    "Address" TEXT,
    "Notes" TEXT,
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
