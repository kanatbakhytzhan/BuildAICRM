-- Add welcomeDocumentUrls for PDF/documents per topic (catalog)
ALTER TABLE "TenantTopic" ADD COLUMN IF NOT EXISTS "welcomeDocumentUrls" JSONB;
