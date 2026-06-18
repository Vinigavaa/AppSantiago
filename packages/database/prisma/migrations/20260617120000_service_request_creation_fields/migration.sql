-- CreateEnum
CREATE TYPE "ServiceRequestUrgency" AS ENUM ('URGENT', 'THIS_WEEK', 'FLEXIBLE');

-- AlterTable: novos campos da criação de solicitação e endereço opcional na criação.
ALTER TABLE "ServiceRequest"
  ADD COLUMN "urgency" "ServiceRequestUrgency" NOT NULL DEFAULT 'FLEXIBLE',
  ADD COLUMN "budgetMin" DECIMAL(10,2),
  ADD COLUMN "budgetMax" DECIMAL(10,2),
  ALTER COLUMN "addressStreet" DROP NOT NULL,
  ALTER COLUMN "addressNumber" DROP NOT NULL,
  ALTER COLUMN "addressNeighborhood" DROP NOT NULL,
  ALTER COLUMN "addressZipCode" DROP NOT NULL;
