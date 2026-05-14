-- Create SparePartCategory table
CREATE TABLE IF NOT EXISTS public."SparePartCategory" (
    "ID" SERIAL PRIMARY KEY,
    "Name" CHARACTER VARYING(100) NOT NULL,
    "Description" TEXT
);

-- Create SparePart table
CREATE TABLE IF NOT EXISTS public."SparePart" (
    "ID" SERIAL PRIMARY KEY,
    "Name" CHARACTER VARYING(200) NOT NULL,
    "Unit" CHARACTER VARYING(50), -- e.g., Cái, Chiếc, Mét
    "CategoryID" INTEGER REFERENCES public."SparePartCategory"("ID") ON DELETE SET NULL,
    "MinQuantity" INTEGER DEFAULT 0,
    "CurrentQuantity" INTEGER DEFAULT 0,
    "Description" TEXT,
    "ImageUrl" TEXT,
    "CreatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create SparePartTransaction table
CREATE TABLE IF NOT EXISTS public."SparePartTransaction" (
    "ID" SERIAL PRIMARY KEY,
    "SparePartID" INTEGER REFERENCES public."SparePart"("ID") ON DELETE CASCADE,
    "Type" CHARACTER VARYING(10) NOT NULL CHECK ("Type" IN ('IN', 'OUT')),
    "Quantity" INTEGER NOT NULL,
    "TransactionDate" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "Note" TEXT,
    "RelatedReportID" INTEGER REFERENCES public."DamageReport"("ID") ON DELETE SET NULL,
    "CreatedBy" TEXT,
    "CreatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some initial categories
INSERT INTO public."SparePartCategory" ("Name", "Description") VALUES 
('Vật tư điện', 'Bóng đèn, ổ cắm, dây điện...'),
('Thiết bị văn phòng', 'Điện thoại bàn, chuột, bàn phím...'),
('Vật tư nước', 'Vòi nước, ống dẫn...'),
('Khác', 'Các vật tư khác')
ON CONFLICT DO NOTHING;
