-- Anexos de imagem no chat.
--
-- A coluna attachmentUrl ja existia (preparada, porem nunca usada: todas as
-- linhas estao NULL). Falta o public_id, sem o qual nao ha como apagar o arquivo
-- na Cloudinary quando a mensagem e excluida.
--
-- Aditiva e sem backfill: como nenhuma mensagem tem anexo hoje, nao existe URL
-- de onde derivar um public_id.
ALTER TABLE "Message" ADD COLUMN "attachmentPublicId" TEXT;
