ALTER TABLE "Filial"
ADD COLUMN IF NOT EXISTS "cieloWebhookHeaderKey" TEXT,
ADD COLUMN IF NOT EXISTS "cieloWebhookHeaderValue" TEXT;
