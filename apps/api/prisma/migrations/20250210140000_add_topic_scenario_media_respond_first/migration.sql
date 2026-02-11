-- AlterTable TenantTopic: сценарий и медиа по теме (Этап 4)
ALTER TABLE "TenantTopic" ADD COLUMN "scenarioText" TEXT;
ALTER TABLE "TenantTopic" ADD COLUMN "mediaUrl" TEXT;

-- TenantSettings.respondFirst по умолчанию false (не приветствовать первым)
ALTER TABLE "TenantSettings" ALTER COLUMN "respondFirst" SET DEFAULT false;
