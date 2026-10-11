CREATE TABLE IF NOT EXISTS "DeviceTransfers" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "DeviceId" UUID NOT NULL REFERENCES "Devices"("Id") ON DELETE CASCADE,
    "FromDepartmentId" UUID REFERENCES "Departments"("Id"),
    "ToDepartmentId" UUID REFERENCES "Departments"("Id"),
    "FromLocationId" UUID REFERENCES "Locations"("Id"),
    "ToLocationId" UUID REFERENCES "Locations"("Id"),
    "TransferredByUserId" UUID NOT NULL REFERENCES "Users"("Id"),
    "TransferDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "Notes" TEXT
);

CREATE INDEX IF NOT EXISTS "IX_DeviceTransfers_DeviceId" ON "DeviceTransfers"("DeviceId");
