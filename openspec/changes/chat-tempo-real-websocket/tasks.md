## 0. Pré-requisito de infraestrutura

- [ ] 0.1 Confirmar no painel do Render que o plano do serviço `appsantiago` aceita WebSocket e que manter conexões abertas cabe no consumo de horas contratado (bloqueia o deploy do backend — ver Open Questions do design)
- [ ] 0.2 Confirmar que o serviço roda em **uma única instância** e registrar isso no README de deploy, já que o registro de conexões vive na memória do processo

## 1. Backend — infraestrutura de realtime

- [x] 1.1 Adicionar `@hono/node-ws` às dependências de `apps/api/package.json` (o `ws` do runtime já vem como dependência dele; `@hono/node-server` subiu para `^1.19.11`, o peer exigido)
- [x] 1.2 Criar `apps/api/src/modules/realtime/types.ts` com o tipo discriminado dos eventos (`message:new`, `message:read`, `message:deleted`) e seus payloads, servindo de contrato único com o app
- [x] 1.3 Criar `apps/api/src/modules/realtime/tickets.ts`: `issueTicket(userId)` gerando token opaco criptograficamente aleatório com validade ≤60s, e `consumeTicket(token)` que devolve o `userId` e invalida o ticket no primeiro uso
- [x] 1.4 Implementar em `tickets.ts` a limpeza preguiçosa de tickets expirados na leitura, para o `Map` não crescer indefinidamente
- [x] 1.5 Criar `apps/api/src/modules/realtime/registry.ts` com `Map<userId, Set<connection>>`, expondo `addConnection`, `removeConnection` e `publish(userId, event)`
- [x] 1.6 Garantir em `registry.ts` que a chave do usuário é apagada quando o `Set` esvazia, e que `publish` para usuário sem conexão é um no-op silencioso
- [x] 1.7 Envolver `publish` em tratamento de erro que registra log e nunca propaga exceção para quem chamou (a publicação é complementar)

## 2. Backend — endpoint de ticket e rota `/ws`

- [x] 2.1 Criar `apps/api/src/modules/realtime/handlers.ts` com `createRealtimeTicketHandler`, devolvendo `{ ticket, expiresIn }` para a sessão autenticada
- [x] 2.2 Registrar `POST /realtime/ticket` em `apps/api/src/modules/app-routes.ts`, sob o mesmo middleware de autenticação das demais rotas do app
- [x] 2.3 Ligar `createNodeWebSocket` + `injectWebSocket` em `apps/api/src/index.ts`, mantendo o log de inicialização atual (o `createNodeWebSocket` mora em `modules/realtime/websocket.ts` para não criar import circular com o `app`)
- [x] 2.4 Registrar a rota `GET /ws` em `apps/api/src/http/app.ts`, fora do grupo autenticado por cookie
- [x] 2.5 No `onOpen` de `/ws`: ler `ticket` da query, chamar `consumeTicket` e, em caso de falha, fechar a conexão imediatamente sem entregar nada
- [x] 2.6 No `onOpen` com ticket válido: registrar a conexão no `registry` sob o `userId` resolvido, guardando esse vínculo como única fonte de identidade da conexão
- [x] 2.7 Implementar `onClose` e `onError` removendo a conexão do `registry` em ambos os casos
- [x] 2.8 Responder `pong` a mensagens `ping` recebidas do cliente, e ignorar qualquer outra mensagem vinda da conexão (o canal é servidor→cliente; o cliente não declara identidade nem conversa)
- [x] 2.9 Verificar: conexão sem ticket, com ticket inválido e com ticket já usado são todas recusadas (coberto por `npm run realtime:smoke`, junto do caso de sessão ausente na emissão do ticket)

## 3. Backend — publicação dos eventos de chat

- [x] 3.1 Em `sendMessageHandler` (`apps/api/src/modules/chat/handlers.ts`), publicar `message:new` para `recipient.userId` após a transação de criação, com `serializeMessage(message, recipient.userId)` para a mensagem sair na perspectiva de quem recebe
- [x] 3.2 Posicionar a publicação junto da criação de `Notification` e do `sendPushToUser`, mantendo o mesmo padrão de efeito complementar que não altera a resposta `201`
- [x] 3.3 Em `listMessagesHandler`, capturar os ids das mensagens afetadas pelo `updateMany` de leitura e publicar `message:read` para o remetente delas, apenas quando ao menos uma mensagem mudou de estado
- [x] 3.4 Ajustar a consulta de `listMessagesHandler` para saber quais ids foram marcados (o `updateMany` só devolve contagem), sem alterar o formato da resposta HTTP
- [x] 3.5 Em `deleteMessageHandler`, publicar `message:deleted` para o outro participante somente após o `deleteMany` confirmar a remoção (`count > 0`)
- [x] 3.6 Garantir que nenhum evento é publicado quando há bloqueio entre os participantes, reaproveitando a checagem `isBlockedBetween` já presente nos handlers
- [x] 3.7 Verificar que as respostas de `GET /chats`, `GET /chats/:id/messages`, `POST /chats/:id/messages` e `DELETE …/:messageId` permanecem compatíveis com as atuais (coberto por `npm run realtime:smoke`; nenhum handler alterou o corpo de resposta)

## 4. Mobile — cliente de realtime

- [x] 4.1 Adicionar `fetchRealtimeTicket()` em `src/features/realtime/service.ts`, reaproveitando `appFetch` (ficou no próprio módulo de realtime em vez de `chat/service.ts`: o cliente de realtime é infraestrutura genérica e não deve depender da feature de chat)
- [x] 4.2 Criar `src/features/realtime/types.ts` espelhando o contrato de eventos do backend
- [x] 4.3 Criar `src/features/realtime/client.ts` com a conexão em escopo de módulo e o conjunto de assinantes, expondo `subscribe(handler)` que devolve `unsubscribe`
- [x] 4.4 Implementar em `client.ts`: o primeiro `subscribe` obtém o ticket e abre a conexão; assinaturas seguintes reutilizam a conexão existente sem abrir outra
- [x] 4.5 Implementar o encerramento: quando o último assinante sai, fechar a conexão e limpar o estado do módulo
- [x] 4.6 Implementar reconexão automática com backoff exponencial com teto (~1s→15s) e jitter, obtendo um ticket novo a cada tentativa
- [x] 4.7 Implementar heartbeat: enviar `ping` a cada ~25s e reconectar se o `pong` não chegar dentro da janela esperada
- [x] 4.8 Expor um callback de "conectado/reconectado" que os assinantes possam usar como gatilho de reconciliação
- [x] 4.9 Fechar a conexão quando o `AppState` sai de `active` e reabrir ao voltar, disparando o gatilho de reconciliação
- [x] 4.10 Fechar a conexão e limpar o estado do módulo no logout (`auth-service.signOut` e os dois fluxos de exclusão de conta, que encerram a sessão sem passar pelo service)
- [x] 4.11 Criar o hook `useRealtimeEvent(type, handler)` em `src/features/realtime/hooks.ts`, com o handler guardado em `ref` para que a assinatura não seja recriada a cada render (mais `useRealtimeConnection` para o gatilho de reconciliação)

## 5. Mobile — remoção do polling e aplicação dos eventos

- [x] 5.1 Remover de `src/features/chat/hooks.ts` as constantes `CHAT_LIST_POLL_MS` e `CHAT_MESSAGES_POLL_MS` e os dois `setInterval`, mantendo a carga inicial no `useFocusEffect`
- [x] 5.2 Em `useChat`: aplicar `message:new` inserindo a mensagem apenas quando o `chatId` do evento é o da tela e o id ainda não existe na lista
- [x] 5.3 Em `useChat`: aplicar `message:read` marcando como lidas as mensagens cujos ids vieram no evento
- [x] 5.4 Em `useChat`: aplicar `message:deleted` removendo a mensagem pelo id, sem erro caso ela já não esteja na lista
- [x] 5.5 Em `useChat`: reconciliar com uma única chamada a `load("silent")` no gatilho de conexão/reconexão
- [x] 5.6 Revisar `mergeMessages` para o novo contexto: continua conciliando as mensagens otimistas pendentes, agora com a reconciliação de reconexão em vez do poll
- [x] 5.7 Em `useChats`: aplicar `message:new` atualizando prévia, contagem de não lidas e reordenando a conversa para o topo, sem requisição
- [x] 5.8 Em `useChats`: quando o `chatId` do evento não estiver na lista, disparar uma única `load("silent")` para incorporar a conversa nova
- [x] 5.9 Em `useChats`: aplicar `message:deleted` com uma carga única (a prévia substituta exige o servidor). `message:read` não afeta a lista de propósito — ele informa que mensagens *enviadas* por este usuário foram lidas, e o resumo da conversa não exibe recibo; está comentado no código
- [x] 5.10 Em `useChats`: reconciliar com uma única carga no gatilho de conexão/reconexão, mantendo o `pull-to-refresh` como ação do usuário
- [x] 5.11 Confirmar por busca no diretório `src/features/chat` que não restou nenhum `setInterval` nem outro disparo por tempo (só resta o `setTimeout` do retry de envio, que é ação do usuário)

## 5b. Marcar como lida com a conversa já aberta (lacuna encontrada na implementação)

Quem marcava as mensagens como lidas era o `GET /chats/:id/messages` chamado pelo poll de 2s. Sem polling, uma mensagem que chega com a conversa **já aberta** ficaria não lida até a tela ser reaberta — o remetente nunca veria o recibo e a contagem da lista ficaria suja. Reusar o histórico a cada mensagem recebida resolveria, mas rebaixaria toda a conversa por mensagem.

- [x] 5b.1 Extrair `markReceivedAsRead(chatId, userId, senderUserId)` em `apps/api/src/modules/chat/handlers.ts`, com a marcação e a publicação de `message:read` que já existiam no `listMessagesHandler`
- [x] 5b.2 Criar `markChatReadHandler` e registrar `POST /chats/:id/read` (aditivo; a APK antiga nunca chama), devolvendo `{ read: number }` e aplicando as mesmas checagens de participação e bloqueio
- [x] 5b.3 Fazer `listMessagesHandler` usar a função extraída, sem alterar o formato da resposta
- [x] 5b.4 Adicionar `markChatRead(chatId)` em `src/features/chat/service.ts` e chamá-la no `useChat` ao aplicar `message:new`

## 6. Verificação

- [x] 6.1 `npm run api:typecheck` e o typecheck do app passando
- [x] 6.1b `npm run realtime:smoke` passando (35 checks): ticket, recusas de handshake, heartbeat, os três eventos, marcação de leitura, autorização e formato das respostas REST
- [ ] 6.2 Dois usuários simultâneos (Android Studio + Web): A envia, B recebe na hora com a conversa aberta, sem tocar na tela
- [ ] 6.3 A envia com B na lista de conversas: prévia, contagem e ordenação mudam sem requisição
- [ ] 6.4 B abre a conversa: A vê o recibo de leitura aparecer sem atualizar a tela
- [ ] 6.5 A exclui uma mensagem não lida: ela some da tela de B imediatamente
- [ ] 6.6 Conversa aberta e ociosa por alguns minutos: nenhuma requisição no log da API além do heartbeat do socket
- [ ] 6.7 Modo avião com o app aberto e volta: reconecta sozinho e as mensagens perdidas aparecem na reconciliação
- [ ] 6.8 App em segundo plano e volta ao primeiro plano: reconecta e reconcilia
- [ ] 6.9 API reiniciando durante o uso: o app reconecta com backoff, sem erro bloqueante na tela
- [ ] 6.10 Servidor hibernado (cold start): a primeira conexão falha e a reconexão se recupera sozinha
- [ ] 6.11 Bloqueio entre participantes: nenhum evento é entregue entre eles
- [ ] 6.12 Regressão da APK instalada: rodar o build anterior contra a API nova e confirmar que o chat continua funcionando pelo polling
