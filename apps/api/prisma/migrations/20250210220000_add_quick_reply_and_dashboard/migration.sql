-- QuickReplyTemplate for configurable quick reply buttons
CREATE TABLE IF NOT EXISTS "QuickReplyTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "messageText" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickReplyTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuickReplyTemplate_tenantId_idx" ON "QuickReplyTemplate"("tenantId");
ALTER TABLE "QuickReplyTemplate" ADD CONSTRAINT "QuickReplyTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
