-- Denuncia de conteudo/usuario, ocultacao por moderacao e suspensao de usuario.
-- Aditiva: todas as colunas novas sao nulas, nenhum dado existente muda.

CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'MESSAGE', 'REVIEW', 'SERVICE_REQUEST', 'PORTFOLIO_ITEM');

CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'ASSEDIO', 'CONTEUDO_SEXUAL', 'VIOLENCIA', 'DISCURSO_DE_ODIO', 'GOLPE', 'OUTRO');

CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

CREATE TABLE "ContentReport" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentReport_reporterId_targetType_targetId_key" ON "ContentReport"("reporterId", "targetType", "targetId");

CREATE INDEX "ContentReport_status_idx" ON "ContentReport"("status");

CREATE INDEX "ContentReport_createdAt_idx" ON "ContentReport"("createdAt");

ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;

ALTER TABLE "Message" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "hiddenReason" TEXT;

ALTER TABLE "Review" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "hiddenReason" TEXT;

ALTER TABLE "ServiceRequest" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "ServiceRequest" ADD COLUMN "hiddenReason" TEXT;

ALTER TABLE "ProfessionalPortfolioItem" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "ProfessionalPortfolioItem" ADD COLUMN "hiddenReason" TEXT;
