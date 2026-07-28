## Context

Metade da funcionalidade pedida já existe. Estado atual verificado no código:

| Peça | Existe? | Onde |
|---|---|---|
| Card "Propostas recusadas" | Sim | `DashboardScreen.tsx:56` |
| Filtro "Propostas recusadas" | Sim | `ProfessionalServicesScreen.tsx:29` |
| Endpoint de recusadas | Sim | `GET /professional/proposals/rejected` |
| `RejectedProposalCard` | Sim | mostra título, categoria, cidade, valor, data |
| Contagem `rejectedProposals` | Sim | `professionalDashboardHandler` |
| Nome do cliente nos cards | **Não** | payload não traz o cliente |
| Tudo referente a "em aberto" | **Não** | — |

O trabalho real é replicar a trilha de "recusadas" para "pendentes" e acrescentar o
nome do cliente aos dois. O padrão a seguir já está estabelecido de ponta a ponta:
handler → rota → `service.ts` → hook com `useFocusEffect` → card → filtro.

Invariante relevante do domínio, confirmada nos handlers: quando o cliente aceita uma
proposta, as demais pendentes daquela solicitação viram `REJECTED`
(`proposals/handlers.ts:319`); quando um contrato é cancelado, a proposta vira
`CANCELED` e a solicitação volta a `OPEN` (`contracts`); quando a solicitação é
excluída, as propostas caem em cascata. Ou seja, **`PENDING` já significa
"aguardando decisão"** — não é preciso cruzar com o status da solicitação.

## Goals / Non-Goals

**Goals:**
- Card "Propostas em aberto" idêntico em visual aos demais indicadores.
- Filtro "Propostas em aberto" na tela de serviços já existente.
- Nome do cliente nas propostas em aberto e recusadas.
- Reaproveitar o caminho de "recusadas" em vez de inventar um novo.

**Non-Goals:**
- Não criar uma tela nova de propostas: o pedido é explícito em usar a tela de
  serviços existente.
- Não permitir cancelar a proposta a partir da lista — a listagem é de acompanhamento.
  (O endpoint de cancelamento já existe e pode virar outra change.)
- Nenhuma migration: os dados já estão em `Proposal.status`.
- Não introduzir cache/estado global de propostas; `useFocusEffect` já cobre a
  sincronização exigida.

## Decisions

### 1. Contagem por `status: "PENDING"`, sem cruzar com a solicitação

`pendingProposals` entra no `professionalDashboardHandler` como mais um
`prisma.proposal.count`, ao lado do de recusadas:

```ts
prisma.proposal.count({ where: { professionalId, status: "PENDING" } })
```

**Alternativa descartada**: filtrar também por `serviceRequest.status === "OPEN"`.
Seria uma condição redundante — os handlers de aceitar, recusar e cancelar já tiram a
proposta de `PENDING` em todos os caminhos. Adicionar o cruzamento só esconderia um
eventual bug de consistência em vez de expô-lo.

### 2. Endpoint separado para pendentes, espelhando o de recusadas

`GET /professional/proposals/pending` com o mesmo shape do de recusadas. Poderia ser
um único endpoint com `?status=`, mas seriam duas telas consumindo caminhos diferentes
do mesmo handler para ganhar pouco: duas funções curtas e explícitas são mais fáceis
de ler do que uma com ramificação por query string.

Ambos os handlers passam a selecionar o nome do cliente:

```ts
serviceRequest: {
  select: {
    title: true,
    category: { select: { name: true } },
    city: { select: { name: true, state: true } },
    client: { select: { user: { select: { name: true } } } },
  },
}
```

O nome vive em `User`, não em `ClientProfile` — o mesmo caminho que
`services-handlers.ts:28` já usa. No payload ele é achatado para
`serviceRequest.client.name`, para o mobile não precisar navegar pela relação.
Isso é aditivo: a APK instalada ignora o campo novo.

### 3. Um componente de card para as duas situações

`RejectedProposalCard` vira `ProposalStatusCard`, recebendo a situação por prop:

```tsx
<ProposalStatusCard proposal={proposal} status="pending" />
<ProposalStatusCard proposal={proposal} status="rejected" />
```

O layout é o mesmo; muda o ícone, a cor do selo e o texto ("Aguardando resposta" em
âmbar, "Recusada" em vermelho). Duplicar o arquivo para trocar três valores seria
código repetido — aqui a repetição é real e já observada, então extrair se justifica.

**Alternativa descartada**: manter dois componentes irmãos. Divergiriam com o tempo,
e o pedido é explícito em que as duas listas mostrem as mesmas informações.

### 4. Tipo único `ProfessionalProposal`

`RejectedProposal` é renomeado para `ProfessionalProposal` e ganha o cliente. As duas
listas usam o mesmo tipo, já que os payloads são idênticos.

### 5. Layout do grid: arrecadado em largura total

Com 5 indicadores, o dashboard passa a ter três linhas: dois cards, dois cards, e
"Total arrecadado" ocupando a linha inteira. As duas linhas de cima agrupam
serviços em cima e propostas embaixo, e o faturamento ganha destaque em vez de
ficar um card órfão ao lado de um vazio. `DashboardCard` não muda: o `flex: 1` já
faz o card sozinho preencher a linha.

### 6. Novo hook `usePendingProposals`, irmão de `useRejectedProposals`

Mesma estrutura, mesmo `useFocusEffect`. Isso satisfaz o requisito de sincronização
sem estado global: sair para enviar uma proposta e voltar ao dashboard ou à tela de
serviços refaz a leitura.

**Trade-off aceito**: a tela de serviços passa a disparar três leituras ao focar
(contratos, pendentes, recusadas). São requisições pequenas e paralelas para
"dezenas ou poucas centenas de usuários"; carregar sob demanda por filtro
adicionaria estado de controle sem ganho perceptível.

## Risks / Trade-offs

- **Proposta pendente cuja solicitação saiu de `OPEN` por um caminho não previsto** →
  apareceria na lista como "aguardando" sem estar. Os caminhos conhecidos estão
  cobertos; se surgir, o sintoma fica visível na própria lista, o que é preferível a
  mascarar com um filtro extra.

- **Três requisições ao focar a tela de serviços** → aceito conforme a decisão 6;
  se virar problema, a correção é carregar por filtro, sem mudar contratos de API.

- **Renomear `RejectedProposal` e `RejectedProposalCard`** → toca arquivos que hoje
  funcionam. O `tsc` acusa qualquer referência perdida, então o risco é baixo e
  detectado antes de rodar.

- **Nome do cliente é dado pessoal** → já é exibido ao profissional nas telas de
  oportunidade e de serviço; expor apenas o nome (sem telefone ou endereço) em uma
  proposta que ele mesmo enviou não amplia o que ele já podia ver.
