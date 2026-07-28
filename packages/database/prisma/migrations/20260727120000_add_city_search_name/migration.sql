-- Coluna normalizada para busca de cidades (sem acento, minúscula) e seu índice.
-- Nullable de propósito: permite adicionar a coluna sem travar a migration em
-- bases já populadas; a carga (seed) faz o backfill do valor para cada município.

ALTER TABLE "City" ADD COLUMN "searchName" TEXT;

CREATE INDEX "City_searchName_idx" ON "City"("searchName");
