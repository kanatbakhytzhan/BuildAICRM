-- Drop old table (LeadDailyStat replaced by LeadStats)
DROP TABLE IF EXISTS "LeadDailyStat";

-- CreateTable
CREATE TABLE "LeadStats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadStats_tenantId_idx" ON "LeadStats"("tenantId");

-- CreateIndex
CREATE INDEX "LeadStats_date_idx" ON "LeadStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "LeadStats_tenantId_topicId_date_key" ON "LeadStats"("tenantId", "topicId", "date");
