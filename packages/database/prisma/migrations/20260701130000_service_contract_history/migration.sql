-- Uma solicitação passa a admitir mais de um contrato ao longo do tempo: após um
-- cancelamento por não comparecimento, ela é reaberta e pode ser recontratada,
-- preservando o contrato cancelado para auditoria. Remove a restrição de unicidade
-- em serviceRequestId, mantendo um índice comum para as consultas.
DROP INDEX "ServiceContract_serviceRequestId_key";
CREATE INDEX "ServiceContract_serviceRequestId_idx" ON "ServiceContract"("serviceRequestId");
