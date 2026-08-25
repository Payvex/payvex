BEGIN;

ALTER TABLE "Filial"
  ADD COLUMN IF NOT EXISTS "woocommerceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "woocommerceConsumerKey" TEXT,
  ADD COLUMN IF NOT EXISTS "woocommerceConsumerSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "mercadoPagoTestMode" BOOLEAN DEFAULT false;

COMMIT;
