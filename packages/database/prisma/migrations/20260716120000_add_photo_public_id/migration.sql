-- Guarda o public_id da Cloudinary junto de cada foto.
--
-- Ate aqui so a URL final era persistida, e sem o public_id nao ha como apagar o
-- arquivo no CDN quando a foto e removida — as imagens ficavam orfas para sempre.
--
-- A coluna e opcional: linhas antigas cuja URL nao siga o formato esperado ficam
-- com NULL e sao simplesmente ignoradas pela limpeza.
ALTER TABLE "ServiceRequestPhoto" ADD COLUMN "publicId" TEXT;
ALTER TABLE "ProfessionalPortfolioItem" ADD COLUMN "publicId" TEXT;

-- Backfill das linhas existentes. A URL foi montada pelo servidor no formato
--   https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v<versao>/<publicId>
-- entao o public_id e tudo que vem depois do segmento de versao (/v123/). O
-- public_id pode conter barras (ex.: santiago/requests/<userId>/<arquivo>), por
-- isso a captura vai ate o fim da string.
UPDATE "ServiceRequestPhoto"
SET "publicId" = substring("url" from '/v[0-9]+/(.+)$')
WHERE "publicId" IS NULL;

UPDATE "ProfessionalPortfolioItem"
SET "publicId" = substring("imageUrl" from '/v[0-9]+/(.+)$')
WHERE "publicId" IS NULL;
