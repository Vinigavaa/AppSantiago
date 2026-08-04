## ADDED Requirements

### Requirement: Área de navegação por tipo de notificação
Todo tipo de notificação SHALL estar associado a exatamente uma área da navegação inferior. O backend MUST manter esse mapa como fonte única, usado tanto para contar quanto para marcar como lido.

Mapa por perfil:

| Tipo | Cliente | Profissional |
| --- | --- | --- |
| `PROPOSAL_RECEIVED` | `proposals` | `dashboard` |
| `PROPOSAL_ACCEPTED` | `proposals` | `dashboard` |
| `PROPOSAL_REJECTED` | `proposals` | `dashboard` |
| `SERVICE_UPDATED` | `proposals` | `services` |
| `REVIEW_RECEIVED` | `profile` | `profile` |
| `MESSAGE_RECEIVED` | `messages` | `messages` |
| `SYSTEM` | `profile` | `profile` |

#### Scenario: Tipo sem área conhecida
- **WHEN** o backend encontra uma notificação cujo tipo não está no mapa
- **THEN** ela SHALL ser tratada como área `profile`, sem lançar erro

#### Scenario: Mesma notificação, áreas diferentes por perfil
- **WHEN** um cliente e um profissional possuem, cada um, uma notificação `PROPOSAL_ACCEPTED` não lida
- **THEN** o badge do cliente aparece em "Propostas" e o do profissional aparece em "Dashboard"

### Requirement: Endpoint de contagem por área
O sistema SHALL expor `GET /notifications/badges`, autenticado, devolvendo a contagem de pendências não visualizadas por área do usuário da sessão.

A resposta MUST ter o formato `{ "badges": { "proposals": number, "messages": number, "services": number, "dashboard": number, "profile": number } }`, sempre com todas as chaves presentes e valor mínimo `0`.

A contagem de `messages` MUST vir do total de mensagens de chat não lidas do usuário, e não da tabela de notificações. As demais áreas MUST contar as notificações com `readAt = null` cujo tipo pertence àquela área, conforme o perfil do usuário.

#### Scenario: Usuário sem pendências
- **WHEN** um usuário autenticado sem notificações não lidas e sem mensagens não lidas chama `GET /notifications/badges`
- **THEN** a resposta é `200` com todas as áreas em `0`

#### Scenario: Cliente com propostas novas
- **WHEN** um cliente com 3 notificações `PROPOSAL_RECEIVED` não lidas chama o endpoint
- **THEN** `badges.proposals` é `3` e as demais áreas permanecem em `0`

#### Scenario: Mensagens não lidas
- **WHEN** o usuário tem 2 mensagens de chat não lidas e nenhuma notificação `MESSAGE_RECEIVED` não lida
- **THEN** `badges.messages` é `2`

#### Scenario: Mensagens não são contadas em dobro
- **WHEN** o usuário tem 2 mensagens de chat não lidas e também 2 notificações `MESSAGE_RECEIVED` não lidas para as mesmas mensagens
- **THEN** `badges.messages` é `2`

#### Scenario: Requisição sem sessão
- **WHEN** a requisição chega sem sessão válida
- **THEN** a resposta é `401` e nenhuma contagem é exposta

### Requirement: Marcação de leitura por área
`POST /notifications/read` SHALL aceitar um corpo opcional `{ "area": <área> }`. Com `area`, o sistema MUST marcar como lidas apenas as notificações não lidas daquela área, para o perfil do usuário. Sem `area`, o sistema MUST manter o comportamento atual de marcar todas como lidas.

#### Scenario: Compatibilidade com o app já instalado
- **WHEN** o app envia `POST /notifications/read` sem corpo ou com corpo vazio
- **THEN** todas as notificações não lidas do usuário são marcadas como lidas, como antes

#### Scenario: Marcação restrita a uma área
- **WHEN** um cliente com notificações não lidas em `proposals` e em `profile` envia `POST /notifications/read` com `{ "area": "proposals" }`
- **THEN** apenas as de `proposals` ficam lidas e o badge de `profile` permanece

#### Scenario: Área inválida
- **WHEN** o corpo traz uma `area` que não existe
- **THEN** a resposta é `400` com código `INVALID_DATA` e nada é marcado como lido

### Requirement: Indicador visual na barra de abas
A barra de navegação inferior SHALL exibir um indicador sobre o ícone da aba cuja área possui contagem maior que zero, e nenhum indicador nas demais abas.

O indicador MUST usar a cor de destaque já definida no tema, sem alterar tamanho de ícone, rótulo ou altura da barra. Contagens de `1` a `9` MUST ser exibidas como número; contagens acima de `9` MUST ser exibidas como `9+`.

#### Scenario: Aba com pendência
- **WHEN** `badges.proposals` é `3` na navegação do cliente
- **THEN** a aba "Propostas" exibe o indicador com o número `3` e nenhuma outra aba exibe indicador

#### Scenario: Contagem alta
- **WHEN** uma área tem contagem `27`
- **THEN** o indicador exibe `9+`

#### Scenario: Nenhuma pendência
- **WHEN** todas as áreas estão em `0`
- **THEN** a barra de abas fica visualmente idêntica ao estado atual, sem indicadores

### Requirement: Indicador some ao visualizar a área
Ao abrir a aba correspondente, o app SHALL marcar aquela área como lida e zerar o indicador localmente, sem esperar a próxima revalidação.

Para `messages`, o indicador MUST refletir as mensagens de chat ainda não lidas: abrir a lista de conversas não zera o indicador enquanto restarem conversas não abertas.

#### Scenario: Cliente abre a aba de propostas
- **WHEN** o cliente entra na aba "Propostas" com indicador ativo
- **THEN** o app chama `POST /notifications/read` com `{ "area": "proposals" }` e o indicador desaparece imediatamente

#### Scenario: Mensagens parcialmente lidas
- **WHEN** o usuário tem 3 conversas não lidas e abre apenas uma
- **THEN** o indicador de "Mensagens" continua visível, com a contagem restante

#### Scenario: Falha ao marcar como lido
- **WHEN** a chamada de marcação falha por erro de rede
- **THEN** o app não exibe erro ao usuário e o indicador volta a aparecer na próxima revalidação

### Requirement: Atualização sem ação do usuário
As contagens SHALL ser revalidadas enquanto o app está em uso, sem exigir que o usuário troque de tela ou reinicie o aplicativo.

O sistema MUST revalidar: em intervalo periódico enquanto o app está em primeiro plano, ao voltar do segundo plano, e ao receber uma notificação push com o app aberto.

#### Scenario: Chegada de proposta com o app aberto
- **WHEN** um profissional envia uma proposta enquanto o cliente está na aba "Início"
- **THEN** o indicador de "Propostas" aparece em até um ciclo de revalidação, sem interação do usuário

#### Scenario: Retorno do segundo plano
- **WHEN** o usuário volta ao app depois de deixá-lo em segundo plano
- **THEN** as contagens são revalidadas imediatamente

#### Scenario: App em segundo plano
- **WHEN** o app está em segundo plano
- **THEN** nenhuma revalidação periódica é disparada

#### Scenario: Falha de rede na revalidação
- **WHEN** uma revalidação falha
- **THEN** as últimas contagens conhecidas são mantidas, nenhum erro é exibido e a próxima revalidação ocorre normalmente

### Requirement: Escopo por perfil
Os indicadores SHALL respeitar as abas disponíveis para cada perfil. Áreas sem aba no perfil atual MUST ser ignoradas pelo app.

#### Scenario: Cliente não tem aba Dashboard
- **WHEN** a resposta traz `badges.dashboard` maior que zero para um cliente
- **THEN** nenhum indicador é exibido, pois o cliente não possui essa aba

#### Scenario: Profissional recebe proposta aceita
- **WHEN** um cliente aceita a proposta de um profissional
- **THEN** o indicador aparece na aba "Dashboard" do profissional, não em "Propostas"
