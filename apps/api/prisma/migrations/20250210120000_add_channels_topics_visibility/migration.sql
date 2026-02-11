-- CreateTable
CREATE TABLE "TenantChannel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantTopic" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVisibleTopic" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "UserVisibleTopic_pkey" PRIMARY KEY ("userId","topicId")
);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "channelId" TEXT, ADD COLUMN "topicId" TEXT;

-- AlterTable
ALTER TABLE "PipelineStage" ADD COLUMN "topicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TenantChannel_tenantId_externalId_key" ON "TenantChannel"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "TenantChannel_tenantId_idx" ON "TenantChannel"("tenantId");

-- CreateIndex
CREATE INDEX "TenantTopic_tenantId_idx" ON "TenantTopic"("tenantId");

-- CreateIndex
CREATE INDEX "UserVisibleTopic_topicId_idx" ON "UserVisibleTopic"("topicId");

-- CreateIndex
CREATE INDEX "Lead_channelId_idx" ON "Lead"("channelId");

-- CreateIndex
CREATE INDEX "Lead_topicId_idx" ON "Lead"("topicId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_phone_channelId_idx" ON "Lead"("tenantId", "phone", "channelId");

-- CreateIndex
CREATE INDEX "PipelineStage_topicId_idx" ON "PipelineStage"("topicId");

-- AddForeignKey
ALTER TABLE "TenantChannel" ADD CONSTRAINT "TenantChannel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantTopic" ADD CONSTRAINT "TenantTopic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVisibleTopic" ADD CONSTRAINT "UserVisibleTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVisibleTopic" ADD CONSTRAINT "UserVisibleTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TenantTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TenantChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TenantTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TenantTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- После миграции выполните seed: создаст канал "Основной" (externalId default) на каждый тенант и привяжет лидов.
