-- Solicitacoes de redefinicao de senha aguardando confirmacao pelo link do email.
-- Aditiva: nenhuma tabela existente e alterada.

CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmationTokenHash" TEXT NOT NULL,
    "resetToken" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetRequest_confirmationTokenHash_key" ON "PasswordResetRequest"("confirmationTokenHash");

CREATE INDEX "PasswordResetRequest_email_idx" ON "PasswordResetRequest"("email");

CREATE INDEX "PasswordResetRequest_expiresAt_idx" ON "PasswordResetRequest"("expiresAt");
