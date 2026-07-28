-- Profissão em texto livre no perfil do profissional (apresentação) e fila de
-- sugestões de novas categorias (análise administrativa manual).

-- Profissão: aditiva, nullable, sem efeito nas regras (a lógica usa categorias).
ALTER TABLE "ProfessionalProfile" ADD COLUMN "profession" TEXT;

-- Status das sugestões.
CREATE TYPE "CategorySuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Sugestões de categoria enviadas pelos profissionais.
CREATE TABLE "CategorySuggestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professionalId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CategorySuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorySuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategorySuggestion_professionalId_idx" ON "CategorySuggestion"("professionalId");
CREATE INDEX "CategorySuggestion_status_idx" ON "CategorySuggestion"("status");

ALTER TABLE "CategorySuggestion"
    ADD CONSTRAINT "CategorySuggestion_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
