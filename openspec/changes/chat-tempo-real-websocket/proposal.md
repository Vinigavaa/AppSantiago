## Why

O chat é "tempo real" por polling: a conversa aberta refaz `GET /chats/:id/messages` a cada 2s e a lista de conversas refaz `GET /chats` a cada 5s. São requisições repetidas que quase sempre devolvem exatamente o que o app já tem, e o endpoint de mensagens ainda devolve o histórico inteiro da conversa a cada ciclo — o custo cresce com o tamanho do histórico, não com a atividade. Além do desperdício, a latência percebida é irregular: uma mensagem pode levar até 2s para aparecer.

A responsabilidade de avisar que existe algo novo é do servidor, não do app. Com WebSocket o servidor identifica o destinatário e entrega o evento no instante em que a mensagem é criada.

## What Changes

- Nova conexão **WebSocket autenticada** em `GET /ws`, servida pelo mesmo processo Hono (`@hono/node-ws`). Uma conexão por sessão do app, compartilhada por todas as telas.
- Novo endpoint `POST /realtime/ticket`: devolve um ticket de uso único e vida curta usado para autenticar o handshake do WebSocket. Necessário porque o handshake não carrega o cookie de sessão de forma confiável nos três ambientes (Android, iOS e web).
- Novo endpoint `POST /chats/:id/read`: marca as mensagens recebidas como lidas sem devolver o histórico. Quem fazia isso era o `GET /chats/:id/messages` chamado pelo poll; sem ele, uma mensagem que chega com a conversa **já aberta** ficaria não lida até a tela ser reaberta.
- Novo **registro de conexões em memória** no servidor (`userId → conexões`), com publicação de eventos direcionada ao destinatário.
- O servidor passa a publicar eventos de chat no momento em que a mudança acontece:
  - `message:new` — mensagem criada, entregue ao destinatário.
  - `message:read` — mensagens marcadas como lidas, entregue ao remetente (recibo de leitura).
  - `message:deleted` — mensagem excluída antes de ser lida, entregue ao destinatário.
- **Remoção do polling do chat no app**: os `setInterval` de `useChats` (5s) e `useChat` (2s) deixam de existir. Nenhuma requisição periódica substitui esses intervalos.
- A conversa aberta e a lista de conversas passam a se atualizar **por evento**: mensagem nova aparece na hora, prévia e contagem de não lidas da lista mudam sem nova consulta.
- Reconciliação pontual **na conexão e na reconexão** (não periódica): ao abrir uma tela e ao recuperar a conexão, o app faz uma única carga do estado atual, cobrindo o que possa ter acontecido enquanto estava desconectado.
- Reconexão automática com backoff exponencial e heartbeat (ping/pong) para detectar conexões mortas.

Não há mudança **BREAKING**: todos os endpoints REST do chat (`GET /chats`, `GET /chats/:id/messages`, `POST /chats/:id/messages`, `DELETE /chats/:id/messages/:messageId`) permanecem com o mesmo contrato e comportamento. A APK já instalada no cliente continua funcionando pelo polling atual, ignorando o canal novo.

## Capabilities

### New Capabilities
- `chat-realtime`: entrega de eventos de chat do servidor para o app por WebSocket — quando a conexão existe, como é autenticada, quais eventos o servidor publica, para quem, e como o app reage a cada um sem consultar o servidor periodicamente.

### Modified Capabilities
<!-- Nenhuma: o projeto ainda não possui specs consolidadas em openspec/specs/. -->

## Impact

**Backend (`apps/api`)**
- `package.json`: nova dependência `@hono/node-ws` (e `ws`, seu par no runtime Node).
- `src/index.ts`: o `serve()` passa a expor o upgrade de WebSocket junto do servidor HTTP.
- `src/modules/realtime/` (novo): registro de conexões em memória, publicação de eventos, tipos do contrato de eventos e o handler do ticket de autenticação.
- `src/modules/chat/handlers.ts`: `sendMessageHandler`, `listMessagesHandler` e `deleteMessageHandler` passam a publicar o evento correspondente depois de confirmar a escrita no banco. As respostas HTTP não mudam.
- `src/modules/app-routes.ts`: registro de `POST /realtime/ticket`.
- `src/http/app.ts`: registro da rota `/ws` fora do grupo autenticado por cookie (a autenticação é o ticket).
- Sem migration: nenhuma mudança de schema.

**Mobile (`src`)**
- `src/features/realtime/` (novo): cliente WebSocket único (conexão compartilhada, assinatura por evento, reconexão com backoff, encerramento quando não há mais assinantes) e o hook de assinatura usado pelas telas.
- `src/features/chat/hooks.ts`: remoção dos dois `setInterval` e das constantes de intervalo; `useChats` e `useChat` passam a aplicar eventos ao estado local.
- `src/features/chat/service.ts`: nova função para obter o ticket de conexão.

**Compatibilidade**
- APK instalada continua no polling e funcionando: nenhum endpoint REST foi removido, renomeado ou teve o formato de resposta alterado.
- A publicação de eventos é complementar ao fluxo REST — se a publicação falhar, a mensagem já está gravada e o cliente antigo a encontra no próximo poll.

**Infraestrutura (Render)**
- O plano precisa suportar WebSocket e uma instância única: o registro de conexões vive na memória do processo, então múltiplas instâncias quebrariam a entrega. Fica registrado como limite conhecido desta solução.
- Conexões abertas mantêm o serviço acordado enquanto houver usuário com o app aberto — muda o perfil de consumo de horas do plano.
