## MODIFIED Requirements

### Requirement: Área de navegação por tipo de notificação
Todo tipo de notificação SHALL estar associado a exatamente uma área da navegação inferior. O backend MUST manter esse mapa como fonte única, usado tanto para contar quanto para marcar como lido.

Mapa por perfil:

| Tipo | Cliente | Profissional |
| --- | --- | --- |
| `PROPOSAL_RECEIVED` | `proposals` | `dashboard` |
| `PROPOSAL_ACCEPTED` | `proposals` | `services` |
| `PROPOSAL_REJECTED` | `proposals` | `dashboard` |
| `SERVICE_UPDATED` | `proposals` | `services` |
| `REVIEW_RECEIVED` | `profile` | `profile` |
| `MESSAGE_RECEIVED` | `messages` | `messages` |
| `SYSTEM` | `profile` | `profile` |

Para o profissional, `PROPOSAL_ACCEPTED` pertence a `services`: quando o cliente aceita, o que nasce é um serviço contratado, e é na aba "Serviços" que ele aparece. `dashboard` continua sendo a área das propostas ainda em disputa (`PROPOSAL_RECEIVED`, `PROPOSAL_REJECTED`).

#### Scenario: Tipo sem área conhecida
- **WHEN** o backend encontra uma notificação cujo tipo não está no mapa
- **THEN** ela SHALL ser tratada como área `profile`, sem lançar erro

#### Scenario: Mesma notificação, áreas diferentes por perfil
- **WHEN** um cliente e um profissional possuem, cada um, uma notificação `PROPOSAL_ACCEPTED` não lida
- **THEN** o badge do cliente aparece em "Propostas" e o do profissional aparece em "Serviços"

#### Scenario: Proposta aceita não marca o Dashboard
- **WHEN** o profissional recebe o aceite de uma proposta
- **THEN** o indicador aparece apenas em "Serviços" e "Dashboard" permanece sem indicador

### Requirement: Endpoint de contagem por área
O sistema SHALL expor `GET /notifications/badges`, autenticado, devolvendo a contagem de pendências não visualizadas por área do usuário da sessão e os eventos pendentes de aviso.

A resposta MUST ter o formato `{ "badges": { "proposals": number, "messages": number, "services": number, "dashboard": number, "profile": number }, "events": PendingAlert[] }`, com todas as chaves de área sempre presentes e valor mínimo `0`, e `events` sempre presente (lista vazia quando não há nada pendente).

A contagem de `messages` MUST vir do total de mensagens de chat não lidas do usuário, e não da tabela de notificações. As demais áreas MUST contar as notificações com `readAt = null` cujo tipo pertence àquela área, conforme o perfil do usuário.

#### Scenario: Usuário sem pendências
- **WHEN** um usuário autenticado sem notificações não lidas e sem mensagens não lidas chama `GET /notifications/badges`
- **THEN** a resposta é `200` com todas as áreas em `0` e `events` vazio

#### Scenario: Cliente com propostas novas
- **WHEN** um cliente com 3 notificações `PROPOSAL_RECEIVED` não lidas chama o endpoint
- **THEN** `badges.proposals` é `3` e as demais áreas permanecem em `0`

#### Scenario: Mensagens não lidas
- **WHEN** o usuário tem 2 mensagens de chat não lidas e nenhuma notificação `MESSAGE_RECEIVED` não lida
- **THEN** `badges.messages` é `2`

#### Scenario: Mensagens não são contadas em dobro
- **WHEN** o usuário tem 2 mensagens de chat não lidas e também 2 notificações `MESSAGE_RECEIVED` não lidas para as mesmas mensagens
- **THEN** `badges.messages` é `2`

#### Scenario: Contagem e eventos coerentes
- **WHEN** o profissional tem uma notificação `PROPOSAL_ACCEPTED` não lida
- **THEN** `badges.services` é `1` e `events` traz essa notificação

#### Scenario: Requisição sem sessão
- **WHEN** a requisição chega sem sessão válida
- **THEN** a resposta é `401` e nenhuma contagem é exposta
