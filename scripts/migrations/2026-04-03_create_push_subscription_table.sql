-- Create PushSubscription table for PWA Push Notifications
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "ID" SERIAL PRIMARY KEY,
    "UserId" TEXT NOT NULL,
    "Endpoint" TEXT NOT NULL,
    "P256dh" TEXT NOT NULL,
    "Auth" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

-- Index for faster lookup by UserId
CREATE INDEX IF NOT EXISTS idx_push_subscription_user ON "PushSubscription"("UserId");
