-- Add welcomeMediaSentAt: приветственные голос/фото отправлены один раз
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "welcomeMediaSentAt" TIMESTAMP(3);
