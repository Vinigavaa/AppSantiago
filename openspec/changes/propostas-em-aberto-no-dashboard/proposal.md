## Why

O profissional envia propostas e não tem onde acompanhar quais ainda aguardam
resposta do cliente. O dashboard já mostra serviços para iniciar, em andamento,
propostas recusadas e total arrecadado — mas a proposta pendente, que é justamente
a oportunidade viva, só existe dentro da tela da solicitação. Sem esse indicador o
profissional não sabe quantas oportunidades estão em jogo nem consegue revisitá-las.

Levantamento do estado atual: o card **"Propostas recusadas" e o filtro correspondente
na tela de serviços já existem** (`DashboardScreen.tsx:56`, `ProfessionalServicesScreen.tsx:29`).
O que falta é o par equivalente para propostas em aberto, mais o nome do cliente
em ambos os cards de proposta.

## What Changes

- **Backend**: `GET /professional/dashboard` passa a devolver `pendingProposals`
  (contagem de propostas com status `PENDING` do profissional).
- **Backend**: novo endpoint `GET /professional/proposals/pending`, espelhando o de
  recusadas, devolvendo título, categoria, cidade, valor, data de envio e nome do cliente.
- **Backend**: o endpoint de recusadas (`/professional/proposals/rejected`) passa a
  incluir o nome do cliente no payload.
- **Mobile**: novo card "Propostas em aberto" no dashboard, com o mesmo visual dos
  demais, levando à tela de serviços já no filtro correspondente.
- **Mobile**: novo filtro "Propostas em aberto" na tela de serviços, listando as
  propostas pendentes com o rótulo de que aguardam decisão do cliente.
- **Mobile**: card de proposta em aberto (novo) e card de proposta recusada (existente)
  passam a exibir o nome do cliente.
- **Mobile**: o dashboard passa a ter 5 indicadores — as duas primeiras linhas
  continuam com dois cards e "Total arrecadado" passa a ocupar a linha inteira.
- Os indicadores continuam sendo recarregados ao focar a tela (`useFocusEffect`), o
  que já mantém o dashboard sincronizado após enviar, aceitar, recusar ou cancelar
  uma proposta.

## Capabilities

### New Capabilities
- `professional-proposal-tracking`: acompanhamento das propostas enviadas pelo
  profissional — indicadores no dashboard e listagem filtrada por situação.

### Modified Capabilities
<!-- Nenhuma. Não há specs em openspec/specs/; o comportamento existente de
     propostas recusadas é absorvido pela nova capability. -->

## Impact

- **Backend alterado**:
  - `apps/api/src/modules/professional/handlers.ts` (dashboard + novo handler de pendentes + nome do cliente nas recusadas)
  - `apps/api/src/modules/app-routes.ts` (registro da nova rota)
- **Mobile alterado**:
  - `src/features/professional/types.ts` (campo `pendingProposals`, tipo da proposta)
  - `src/features/professional/service.ts` e `hooks.ts` (busca das pendentes)
  - `src/features/professional/DashboardScreen.tsx` (novo card e novo layout do grid)
  - `src/features/professional/ProfessionalServicesScreen.tsx` (novo filtro)
  - `src/features/professional/components/RejectedProposalCard.tsx` (nome do cliente)
- **Mobile novo**: card de proposta em aberto.
- **Banco de dados**: nenhuma migration. Os dados já existem em `Proposal.status`.
- **Compatibilidade com a APK instalada**: `pendingProposals` é um campo novo no
  JSON do dashboard e a rota de pendentes é nova — a APK antiga ignora ambos e
  continua funcionando. O nome do cliente adicionado ao payload de recusadas também
  é aditivo.
