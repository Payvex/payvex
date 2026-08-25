-- AlterTable
ALTER TABLE "Filial" ADD COLUMN     "nuvemShopAccessToken" TEXT,
ADD COLUMN     "nuvemShopStoreId" TEXT,
ADD COLUMN     "nuvemShopUrl" TEXT,
ADD COLUMN     "shopifyAccessToken" TEXT,
ADD COLUMN     "shopifyApiVersion" TEXT DEFAULT '2024-01',
ADD COLUMN     "shopifyStoreId" TEXT,
ADD COLUMN     "shopifyUrl" TEXT;
