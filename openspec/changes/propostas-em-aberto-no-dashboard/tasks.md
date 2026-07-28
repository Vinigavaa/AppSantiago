## 1. Backend

- [x] 1.1 Em `apps/api/src/modules/professional/handlers.ts`, adicionar a contagem `pendingProposals` (`proposal.count` com `status: "PENDING"`) ao `Promise.all` do `professionalDashboardHandler` e incluí-la na resposta
- [x] 1.2 Extrair o `select` das propostas (título, categoria, cidade, cliente) usado pelo handler de recusadas, incluindo `client: { select: { user: { select: { name: true } } } }`
- [x] 1.3 Fazer o `professionalRejectedProposalsHandler` devolver `serviceRequest.client.name` no payload achatado
- [x] 1.4 Criar `professionalPendingProposalsHandler`, espelhando o de recusadas com `status: "PENDING"` e `orderBy: { createdAt: "desc" }`, negando acesso a quem não for profissional
- [x] 1.5 Registrar `GET /professional/proposals/pending` em `apps/api/src/modules/app-routes.ts`
- [x] 1.6 Rodar `npm run api:typecheck`

## 2. Camada de dados do mobile

- [x] 2.1 Em `src/features/professional/types.ts`, adicionar `pendingProposals: number` a `ProfessionalDashboard`
- [x] 2.2 Renomear `RejectedProposal` para `ProfessionalProposal` e adicionar `client: { name: string }` dentro de `serviceRequest`
- [x] 2.3 Em `service.ts`, adicionar `fetchProfessionalPendingProposals` chamando `/professional/proposals/pending`
- [x] 2.4 Em `hooks.ts`, adicionar `usePendingProposals` seguindo a mesma estrutura de `useRejectedProposals` (com `useFocusEffect`)

## 3. Interface

- [x] 3.1 Renomear `RejectedProposalCard` para `ProposalStatusCard`, recebendo a prop `status: "pending" | "rejected"` que define ícone, cor do selo e rótulo ("Aguardando resposta" / "Recusada")
- [x] 3.2 Exibir o nome do cliente no card, abaixo da linha de categoria e cidade
- [x] 3.3 Em `DashboardScreen.tsx`, adicionar o card "Propostas em aberto" (ícone `hourglass-outline`) com `onPress` levando a `?filter=pending`
- [x] 3.4 Reorganizar o grid do dashboard em três linhas: serviços, propostas e "Total arrecadado" ocupando a linha inteira
- [x] 3.5 Em `ProfessionalServicesScreen.tsx`, adicionar o filtro "Propostas em aberto" a `FILTERS` e o mapeamento `pending` em `PARAM_TO_LABEL`
- [x] 3.6 Renderizar a lista de propostas pendentes com estados de carregamento, erro e vazio, reaproveitando a estrutura de `renderRejected`
- [x] 3.7 Incluir as propostas pendentes no cálculo de `hasAnyContent` e no `RefreshControl` do filtro ativo

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` na raiz e corrigir referências quebradas pelos renomes
- [ ] 4.2 Validar no Android Studio e na Web: contagem correta nos dois cards, navegação de cada card para o filtro certo e informações completas nas propostas
- [ ] 4.3 Verificar a sincronização: enviar uma proposta e conferir que a contagem em aberto sobe; ter a proposta recusada e conferir que ela migra de "em aberto" para "recusadas"
