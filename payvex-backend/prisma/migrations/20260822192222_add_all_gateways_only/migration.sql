-- AlterTable
ALTER TABLE "Filial" ADD COLUMN     "asaasApiKey" TEXT,
ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "cieloMerchantId" TEXT,
ADD COLUMN     "cieloMerchantKey" TEXT,
ADD COLUMN     "cieloSandbox" BOOLEAN DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "mercadoPagoTestMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nowPaymentsApiKey" TEXT,
ADD COLUMN     "pagSeguroEmail" TEXT,
ADD COLUMN     "pagSeguroSalt" TEXT,
ADD COLUMN     "pagSeguroSandbox" BOOLEAN DEFAULT false,
ADD COLUMN     "pagSeguroToken" TEXT,
ADD COLUMN     "pagarBankPrivateKey" TEXT,
ADD COLUMN     "pagarMeAccessToken" TEXT,
ADD COLUMN     "picPayPublicKey" TEXT,
ADD COLUMN     "preferredGateway" TEXT,
ADD COLUMN     "stoneApiKey" TEXT,
ADD COLUMN     "stoneClientId" TEXT,
ADD COLUMN     "stoneSecret" TEXT,
ADD COLUMN     "uf" VARCHAR(2),
ADD COLUMN     "woocommerceConsumerKey" TEXT,
ADD COLUMN     "woocommerceConsumerSecret" TEXT,
ADD COLUMN     "woocommerceUrl" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "hasAiAnalyst" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "multiAppLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "prioritySupport" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "filialId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
