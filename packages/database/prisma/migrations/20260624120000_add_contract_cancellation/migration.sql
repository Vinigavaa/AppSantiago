-- AlterTable: auditoria de cancelamento de contrato (quem cancelou + motivo).
ALTER TABLE "ServiceContract"
  ADD COLUMN "canceledBy" UUID,
  ADD COLUMN "cancelReason" TEXT;
