## MODIFIED Requirements

### Requirement: Atualização sem ação do usuário
As contagens SHALL ser atualizadas enquanto o app está em uso, sem exigir que o usuário troque de tela, aguarde um intervalo ou reinicie o aplicativo.

A atualização MUST ser dirigida por evento: ao receber `notification:new` pelo canal realtime, o app MUST incrementar localmente a contagem da área indicada no próprio evento. Ao receber `message:new`, MUST incrementar a contagem de `messages`.

O app MUST NOT manter revalidação periódica por tempo. A recarga completa do estado MUST ocorrer apenas uma vez por conexão estabelecida — o que já cobre a primeira abertura, a reconexão após queda e a volta do segundo plano.

O tempo entre o evento acontecer no servidor e o indicador aparecer MUST ser inferior a 300ms com a conexão aberta.

#### Scenario: Chegada de proposta com o app aberto
- **WHEN** um profissional envia uma proposta enquanto o cliente está na aba "Início"
- **THEN** o indicador de "Propostas" aparece em menos de 300ms, sem interação do usuário

#### Scenario: Mensagem de chat com o app aberto
- **WHEN** o usuário recebe uma mensagem enquanto navega em outra aba
- **THEN** o indicador de "Mensagens" é incrementado imediatamente, sem requisição adicional

#### Scenario: Retorno do segundo plano
- **WHEN** o usuário volta ao app depois de deixá-lo em segundo plano
- **THEN** a conexão é restabelecida e as contagens são recarregadas uma vez

#### Scenario: App em segundo plano
- **WHEN** o app está em segundo plano
- **THEN** nenhuma revalidação é disparada e a conexão é encerrada

#### Scenario: Conexão estável sem eventos
- **WHEN** o app permanece aberto e conectado por vários minutos sem nenhum evento
- **THEN** nenhuma requisição de contagem é feita ao servidor

#### Scenario: Falha de rede na reconciliação
- **WHEN** a recarga disparada por uma conexão falha
- **THEN** as últimas contagens conhecidas são mantidas, nenhum erro é exibido e a próxima conexão tenta novamente

#### Scenario: Evento perdido durante a queda
- **WHEN** um evento ocorre enquanto o app está desconectado e a conexão é restabelecida em seguida
- **THEN** a recarga por conexão traz o indicador correspondente

### Requirement: Endpoint de contagem por área
O sistema SHALL expor `GET /notifications/badges`, autenticado, devolvendo a contagem de pendências não visualizadas por área do usuário da sessão e os eventos pendentes de aviso.

A resposta MUST ter o formato `{ "badges": { "proposals": number, "messages": number, "services": number, "dashboard": number, "profile": number }, "events": PendingAlert[] }`, com todas as chaves de área sempre presentes e valor mínimo `0`, e `events` sempre presente (lista vazia quando não há nada pendente).

A contagem de `messages` MUST vir do total de mensagens de chat não lidas do usuário, e não da tabela de notificações. As demais áreas MUST contar as notificações com `readAt = null` cujo tipo pertence àquela área, conforme o perfil do usuário.

O endpoint deixa de ser a fonte primária de atualização e passa a servir a dois usos: a reconciliação por conexão da versão atual do app e a compatibilidade com versões já instaladas, que continuam consultando em intervalo. O contrato MUST permanecer inalterado por causa dessas versões.

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

#### Scenario: Versão anterior do app
- **WHEN** um dispositivo com a versão anterior do app consulta o endpoint em intervalo
- **THEN** a resposta mantém exatamente o formato atual e o app continua funcionando

#### Scenario: Requisição sem sessão
- **WHEN** a requisição chega sem sessão válida
- **THEN** a resposta é `401` e nenhuma contagem é exposta

### Requirement: Indicador some ao visualizar a área
Ao abrir a aba correspondente, o app SHALL marcar aquela área como lida e zerar o indicador localmente, sem esperar a próxima recarga.

Para `messages`, o indicador MUST refletir as mensagens de chat ainda não lidas: abrir a lista de conversas não zera o indicador enquanto restarem conversas não abertas.

Se um evento chegar pelo canal realtime enquanto o usuário já está na aba correspondente, a área MUST ser marcada como lida no mesmo instante — o indicador não fica aceso na aba em que o usuário está parado.

#### Scenario: Cliente abre a aba de propostas
- **WHEN** o cliente entra na aba "Propostas" com indicador ativo
- **THEN** o app chama `POST /notifications/read` com `{ "area": "proposals" }` e o indicador desaparece imediatamente

#### Scenario: Evento chega com a aba já aberta
- **WHEN** uma proposta chega enquanto o cliente está parado na aba "Propostas"
- **THEN** a área é marcada como lida e nenhum indicador aparece

#### Scenario: Mensagens parcialmente lidas
- **WHEN** o usuário tem 3 conversas não lidas e abre apenas uma
- **THEN** o indicador de "Mensagens" continua visível, com a contagem restante

#### Scenario: Falha ao marcar como lido
- **WHEN** a chamada de marcação falha por erro de rede
- **THEN** o app não exibe erro ao usuário e o indicador volta a aparecer na próxima recarga
