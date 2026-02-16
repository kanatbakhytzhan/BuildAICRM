-- Стоп-слово для AI: после него модель перестаёт генерировать текст
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "aiStopWord" TEXT;
