/*
  Warnings:

  - The values [SALON,VIP] on the enum `ZonaMesa` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ZonaMesa_new" AS ENUM ('TERRAZA', 'PLANTA_BAJA');
ALTER TABLE "Mesa" ALTER COLUMN "zona" DROP DEFAULT;
ALTER TABLE "Mesa" ALTER COLUMN "zona" TYPE "ZonaMesa_new" USING ("zona"::text::"ZonaMesa_new");
ALTER TYPE "ZonaMesa" RENAME TO "ZonaMesa_old";
ALTER TYPE "ZonaMesa_new" RENAME TO "ZonaMesa";
DROP TYPE "ZonaMesa_old";
ALTER TABLE "Mesa" ALTER COLUMN "zona" SET DEFAULT 'PLANTA_BAJA';
COMMIT;

-- AlterTable
ALTER TABLE "Mesa" ALTER COLUMN "numeroMesa" SET DATA TYPE BIGINT,
ALTER COLUMN "zona" SET DEFAULT 'PLANTA_BAJA';
