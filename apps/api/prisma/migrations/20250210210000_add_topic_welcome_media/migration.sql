-- Add welcome media fields to TenantTopic
ALTER TABLE "TenantTopic" ADD COLUMN IF NOT EXISTS "welcomeVoiceUrl" TEXT;
ALTER TABLE "TenantTopic" ADD COLUMN IF NOT EXISTS "welcomeImageUrl" TEXT;
ALTER TABLE "TenantTopic" ADD COLUMN IF NOT EXISTS "addressText" TEXT;
