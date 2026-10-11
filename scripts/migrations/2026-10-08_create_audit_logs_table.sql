CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "Id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" UUID NOT NULL REFERENCES "Users"("Id"),
    "Action" VARCHAR(50) NOT NULL,
    "TableName" VARCHAR(100) NOT NULL,
    "RecordId" UUID NOT NULL,
    "OldValues" JSONB,
    "NewValues" JSONB,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "IpAddress" VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS "IX_AuditLogs_TableName_RecordId" ON "AuditLogs"("TableName", "RecordId");
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_UserId" ON "AuditLogs"("UserId");
