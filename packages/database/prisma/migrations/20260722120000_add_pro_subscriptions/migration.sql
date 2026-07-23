-- Assinatura paga do profissional (Google Play / App Store) + certificado de
-- participação. O servidor é a fonte de verdade sobre "quem tem assinatura ativa":
-- estado e datas vêm da verificação com a loja, nunca de sinal do dispositivo.
--
-- Migration puramente aditiva (novas tabelas/enums, nenhuma coluna existente é
-- alterada ou removida), segura para rollback.

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'IN_GRACE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionStore" AS ENUM ('GOOGLE_PLAY', 'APP_STORE');

-- CreateTable
CREATE TABLE "ProfessionalSubscription" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'EXPIRED',
    "store" "SubscriptionStore" NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "storeTransactionId" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "gracePeriodEnd" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationCertificate" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "holderNameSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipationCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscription_professionalId_key" ON "ProfessionalSubscription"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscription_storeTransactionId_key" ON "ProfessionalSubscription"("storeTransactionId");

-- CreateIndex
CREATE INDEX "ProfessionalSubscription_status_idx" ON "ProfessionalSubscription"("status");

-- CreateIndex
CREATE INDEX "ProfessionalSubscription_currentPeriodEnd_idx" ON "ProfessionalSubscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_subscriptionId_idx" ON "SubscriptionEvent"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationCertificate_professionalId_key" ON "ParticipationCertificate"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationCertificate_code_key" ON "ParticipationCertificate"("code");

-- CreateIndex
CREATE INDEX "ParticipationCertificate_code_idx" ON "ParticipationCertificate"("code");

-- AddForeignKey
ALTER TABLE "ProfessionalSubscription" ADD CONSTRAINT "ProfessionalSubscription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProfessionalSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationCertificate" ADD CONSTRAINT "ParticipationCertificate_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
