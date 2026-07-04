ALTER TABLE "ApiKey"
ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;

UPDATE "ApiKey"
SET "webhookSecret" =
  'whsec_' ||
  md5(random()::text || clock_timestamp()::text) ||
  md5(random()::text || clock_timestamp()::text)
WHERE "webhookSecret" IS NULL;

ALTER TABLE "ApiKey"
ALTER COLUMN "webhookSecret" SET NOT NULL;
