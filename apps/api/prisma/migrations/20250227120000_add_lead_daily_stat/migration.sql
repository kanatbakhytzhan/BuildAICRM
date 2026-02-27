-- CreateTable
CREATE TABLE "LeadDailyStat" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadDailyStat_tenantId_date_key" ON "LeadDailyStat"("tenantId", "date");

-- CreateIndex
CREATE INDEX "LeadDailyStat_tenantId_date_idx" ON "LeadDailyStat"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "LeadDailyStat" ADD CONSTRAINT "LeadDailyStat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
