-- O chat deixa de ser "uma conversa por solicitação" e passa a ser uma conversa
-- 1:1 por par (cliente <-> profissional), reutilizável e independente de haver
-- solicitação/proposta. As tabelas Chat/Message ainda não eram usadas em produção,
-- então a remodelagem é segura (sem dados a migrar).

-- Chat: remove o vínculo com solicitação/contrato e a unicidade antiga.
DROP INDEX "Chat_serviceRequestId_professionalId_key";
DROP INDEX "Chat_serviceRequestId_idx";
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_serviceRequestId_fkey";
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_serviceContractId_fkey";
ALTER TABLE "Chat" DROP COLUMN "serviceRequestId";
ALTER TABLE "Chat" DROP COLUMN "serviceContractId";

-- Uma única conversa por par cliente/profissional.
CREATE UNIQUE INDEX "Chat_clientId_professionalId_key" ON "Chat"("clientId", "professionalId");

-- Ao remover um perfil, suas conversas somem junto (antes era RESTRICT).
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_clientId_fkey";
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_professionalId_fkey";
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message: estrutura preparada para anexos (hoje sempre nulo).
ALTER TABLE "Message" ADD COLUMN "attachmentUrl" TEXT;

-- Ao remover um usuário, suas mensagens somem junto (antes era RESTRICT).
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
