-- Add welcomeImageUrls for multiple photos per topic
ALTER TABLE "TenantTopic" ADD COLUMN IF NOT EXISTS "welcomeImageUrls" JSONB;
