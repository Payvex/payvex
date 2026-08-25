DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'CRYPTO'
      AND enumtypid = '"PaymentMethod"'::regtype
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'CRYPTO';
  END IF;
END $$;

ALTER TABLE "Filial"
ADD COLUMN IF NOT EXISTS "nowPaymentsIpnSecret" TEXT,
ADD COLUMN IF NOT EXISTS "coinbaseCommerceApiKey" TEXT,
ADD COLUMN IF NOT EXISTS "coinbaseCommerceWebhookSecret" TEXT,
ADD COLUMN IF NOT EXISTS "bitPayToken" TEXT,
ADD COLUMN IF NOT EXISTS "bitPaySandbox" BOOLEAN NOT NULL DEFAULT false;
