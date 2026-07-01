-- Reputação do cliente: nota média e total de avaliações recebidas dos
-- profissionais, atualizadas a cada nova avaliação.
ALTER TABLE "ClientProfile"
  ADD COLUMN "ratingAverage" DECIMAL(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;
