## Context

O estado atual do chat:

- **Backend** (`apps/api`): Hono servido por `@hono/node-server` (`src/index.ts`), hospedado no Render. Autenticação por cookie de sessão do better-auth, resolvida no middleware `requireAuth`. Rotas do app agrupadas em `/api/app` (`src/modules/app-routes.ts`).
- **Chat**: `openChatHandler`, `listChatsHandler`, `listMessagesHandler`, `sendMessageHandler` e `deleteMessageHandler` em `src/modules/chat/handlers.ts`. `sendMessageHandler` já resolve o destinatário (`otherParticipant`), já cria a `Notification` e já dispara push — ou seja, **o ponto onde publicar o evento já existe e já sabe para quem**.
- **Mobile** (`src`): Expo/React Native, sem React Query e sem cache global de servidor. O chat vive em `src/features/chat/hooks.ts`, com `setInterval` de 5s (`useChats`) e 2s (`useChat`), ambos presos ao `useFocusEffect`. O envio é otimista e `mergeMessages` já concilia servidor com mensagens pendentes.

Restrições que moldam o desenho:

- **A APK que o cliente está testando não pode quebrar.** Nenhum endpoint REST do chat pode mudar de caminho, de contrato ou de comportamento. Essa versão continua no polling e precisa continuar funcionando enquanto o build novo não chega ao cliente.
- **Simplicidade** (CLAUDE.md): sem broker, sem fila, sem biblioteca de estado nova. A solução tem que caber em poucos arquivos legíveis.
- **Render**: o serviço hiberna após ociosidade — o app já convive com isso (`MAX_SEND_ATTEMPTS` no envio). Uma conexão que falha porque o servidor está acordando é caso normal, não erro.
- **Homologação em Android Studio e Web**: a solução de autenticação precisa funcionar nos dois.

## Goals / Non-Goals

**Goals:**
- Mensagem enviada por A aparece para B no instante em que é gravada, sem o app perguntar.
- Eliminar do chat toda requisição disparada por tempo.
- Uma conexão por sessão, reutilizada entre telas, sem ouvintes duplicados, encerrada quando não é mais necessária.
- Reconexão automática que sobrevive a queda de rede e a servidor hibernando.
- Recibo de leitura e exclusão de mensagem também em tempo real — sem eles, remover o polling seria uma regressão.
- Zero mudança de schema e zero quebra da versão instalada.

**Non-Goals:**
- Substituir o envio REST por envio pelo WebSocket.
- Remover o poll de 45s dos badges de navegação (`src/features/notifications/badges-context.tsx`) — outra feature, outro momento.
- Indicador de "digitando…", presença online, entrega em duas etapas (enviado/entregue).
- Paginação do histórico de `GET /chats/:id/messages`. Continua devolvendo tudo; vale a pena, mas é uma mudança independente e não bloqueia esta.
- Escalar para múltiplas instâncias da API.
- Substituir o push (`sendPushToUser`), que continua sendo o canal para app fechado.

## Decisions

### 1. WebSocket, não SSE

O React Native não faz streaming de resposta no `fetch`, então SSE exigiria polyfill (`react-native-sse` ou `expo/fetch`) — dependência a mais e um caminho menos testado nas três plataformas. O `WebSocket` é nativo no RN e no navegador, sem dependência no lado do app.

*Alternativa considerada:* SSE, que seria suficiente por ser um canal só de servidor→cliente e passaria por qualquer proxy HTTP. Perde pela fragilidade no RN.

### 2. O envio continua REST; o WebSocket só entrega eventos

O canal é **unidirecional na prática**: servidor → app. `POST /chats/:id/messages` continua sendo o caminho de envio, com toda a validação, resolução de anexo Cloudinary, checagem de bloqueio e rate limit que já existem.

Motivos:
- Reescrever o envio pelo socket duplicaria autorização e validação num segundo caminho — exatamente o tipo de complexidade que o projeto evita.
- O envio otimista já resolve a percepção de instantaneidade para quem envia. Quem precisa de tempo real é quem **recebe**.
- Mantém o contrato REST intacto, que é o requisito da APK instalada.

*Alternativa considerada:* enviar mensagens pelo socket, como Discord. Ganho real só apareceria com volume muito maior de mensagens por segundo.

### 3. `@hono/node-ws` no mesmo processo

`@hono/node-ws` acopla o `ws` ao `serve()` do `@hono/node-server` e permite declarar `/ws` como uma rota Hono comum. Um processo, uma porta, um deploy.

*Alternativa considerada:* subir um `WebSocketServer` do `ws` à parte e tratar o `upgrade` manualmente. Mais código de plumbing para o mesmo resultado.

### 4. Autenticação por ticket de uso único

Fluxo: o app chama `POST /realtime/ticket` (rota autenticada normal, cookie de sessão) e recebe um ticket opaco. Conecta em `wss://…/ws?ticket=<ticket>`. O servidor troca o ticket pelo `userId`, invalida o ticket e passa a tratar a conexão como daquele usuário.

Por quê, e não o cookie direto no handshake:
- No navegador, o construtor `WebSocket` não aceita headers, e o handshake é cross-origin (o app web e a API estão em domínios diferentes) — depender do cookie exigiria `SameSite=None; Secure` e acertar CORS de upgrade, com um modo de falha silencioso e difícil de diagnosticar.
- No React Native dá para passar `headers` no terceiro argumento, mas isso criaria **dois caminhos de autenticação** para manter e homologar.
- O ticket é um caminho só, idêntico em Android, iOS e web.

Sobre o ticket ir na query string: é o padrão para autenticar WebSocket justamente por causa da limitação acima. Mitigações: vida curta (≤60s), uso único, e sempre sobre `wss`. O ticket não substitui a sessão nem dá acesso a nada além de abrir a conexão.

Armazenamento: `Map<ticket, { userId, expiresAt }>` em memória, com limpeza preguiçosa na leitura. Consistente com a decisão 5.

*Alternativas consideradas:* (a) cookie no handshake — descartada acima; (b) primeira mensagem do socket sendo um "authenticate" — deixa a conexão aberta e não autenticada por um intervalo, e complica o estado da conexão.

### 5. Registro de conexões em memória, sem Redis

`Map<userId, Set<WebSocket>>` no processo. Publicar é procurar o `userId` e escrever nas conexões daquele usuário.

Isso funciona porque a API roda em **uma instância**. É um limite real e assumido: com duas instâncias, um usuário conectado na instância A não recebe evento publicado na B. Trocar por Redis pub/sub quando (e se) escalar horizontalmente é uma mudança contida no módulo `realtime`, porque os handlers do chat só chamam `publish(userId, evento)`.

*Alternativa considerada:* já entrar com Redis pub/sub. É a resposta certa para um problema que ainda não existe — infra a mais, ponto de falha a mais, custo a mais.

### 6. O evento carrega o dado pronto, não um "algo mudou"

`message:new` leva a mensagem serializada exatamente como o REST a devolveria, na perspectiva de quem recebe (`mine: false`, `read: false`). O app insere na conversa e pronto.

A alternativa — notificar e o app buscar — seria mais simples de manter (uma fonte de serialização) mas reintroduziria uma requisição por mensagem, que é justamente o que se quer eliminar. O custo é reaproveitar `serializeMessage` na publicação, o que é barato porque a função já existe e já recebe a perspectiva do usuário.

### 7. Quatro eventos, nada além disso

| Evento | Publicado quando | Vai para | Conteúdo |
| --- | --- | --- | --- |
| `message:new` | mensagem gravada | destinatário | `chatId`, mensagem serializada |
| `message:read` | mensagens marcadas como lidas | remetente delas | `chatId`, ids afetados |
| `message:deleted` | exclusão confirmada | outro participante | `chatId`, `messageId` |
| `pong` | resposta ao heartbeat | quem pediu | — |

`message:read` e `message:deleted` não são "extras": hoje quem entrega esses dois estados é o polling. Removê-lo sem eles seria trocar tempo real por regressão.

### 7b. `POST /chats/:id/read` — a leitura que o polling fazia por acidente

*Decisão tomada durante a implementação.*

Quem marcava mensagens como lidas era o `GET /chats/:id/messages`, chamado a cada 2s pelo poll. Isso cobria, sem ninguém perceber, o caso em que a mensagem chega com a conversa **já aberta**. Sem polling, essa mensagem ficaria não lida até a tela ser reaberta: o remetente nunca veria o recibo e a contagem da lista mostraria como não lida uma mensagem visivelmente lida.

Um endpoint dedicado resolve com um payload mínimo. A marcação e a publicação de `message:read` foram extraídas para `markReceivedAsRead`, usada pelos dois handlers — o comportamento do histórico não muda.

*Alternativa considerada:* rechamar `GET /chats/:id/messages` a cada `message:new` recebido. Não exigiria API nova, mas rebaixaria o histórico inteiro por mensagem — exatamente o desperdício que esta mudança existe para eliminar.

O endpoint é aditivo: a APK instalada nunca o chama e continua marcando leitura pelo histórico, como sempre.

### 8. Publicação é complementar e nunca derruba a operação

Mesmo padrão já usado com a `Notification` e o push em `sendMessageHandler`: publica-se **depois** do banco confirmar, com o erro capturado e registrado. Se a publicação falhar, a mensagem está gravada e o destinatário a encontra na próxima carga da tela.

### 9. Ciclo de vida da conexão no app

Um módulo `src/features/realtime/` com uma conexão em escopo de módulo e contagem de assinantes:

- `subscribe(handler)` → se não há conexão, obtém ticket e conecta; registra o handler; devolve `unsubscribe`.
- Último `unsubscribe` → fecha a conexão.
- Cada tela assina em `useEffect`/`useFocusEffect` e devolve o `unsubscribe` no cleanup — o par montagem/desmontagem impede ouvinte duplicado por remontagem.
- Logout fecha a conexão e limpa o estado do módulo.

**App em segundo plano fecha a conexão.** No iOS o socket é suspenso e no Android pode ser derrubado sem aviso; manter uma conexão zumbi só gera confusão. Ao voltar para `active`, reconecta e reconcilia. Enquanto está em segundo plano, quem avisa é o push, que já existe.

*Alternativa considerada:* manter a conexão em background. Não é confiável em nenhuma das duas plataformas e não traz benefício, já que a tela não está visível.

### 10. Reconciliação na conexão — e por que não é polling

Ao conectar e a cada reconexão, cada tela ativa faz **uma** carga (`fetchChats` / `fetchMessages`). Isso cobre o intervalo em que o app esteve desconectado.

A diferença para polling é a origem do disparo: aqui o gatilho é um **evento de conexão**, não um relógio. Com a conexão estável e sem mensagens, o app fica indefinidamente sem falar com o servidor — que é o critério da spec.

### 11. Reconexão com backoff e heartbeat

Backoff exponencial com teto (ex.: 1s → 2s → 4s → 8s → 15s, com jitter para não sincronizar clientes). O teto importa por causa da hibernação do Render: durante o cold start várias tentativas vão falhar seguidas, e martelar não acelera nada.

Heartbeat: o app manda `ping` a cada ~25s e espera `pong`. Sem resposta dentro da janela, considera a conexão morta e reconecta. Sem isso, uma conexão cortada por proxy fica "aberta" para o app e o chat silencia sem ninguém perceber — o pior modo de falha possível ao remover o polling.

### 12. Aplicação de eventos idempotente

Todo evento é aplicado por id: `message:new` não insere se o id já existe; `message:deleted` remove se existir; `message:read` marca os ids informados. Assim, evento duplicado ou fora de ordem, ou a sobreposição entre um evento e a reconciliação, não geram mensagem repetida na tela. Isso substitui o papel que `mergeMessages` fazia contra o polling — a função continua necessária para conciliar as mensagens otimistas pendentes.

## Risks / Trade-offs

- **Instância única obrigatória** → Assumido e documentado. O registro em memória quebra com escala horizontal; a troca por pub/sub fica isolada no módulo `realtime`, porque os handlers só conhecem `publish(userId, evento)`.
- **Perfil de consumo no Render muda** → Conexões abertas mantêm o serviço acordado enquanto houver app aberto. Confirmar antes do deploy que o plano suporta WebSocket e que o consumo de horas é aceitável. É a decisão de infra que precisa estar resolvida antes de mergear.
- **Cold start faz a primeira conexão falhar** → Backoff com jitter e teto; o app não exibe erro bloqueante e as telas continuam usáveis com a carga inicial já feita.
- **Evento perdido = mensagem invisível até a próxima abertura** → Sem polling, um evento perdido não se corrige sozinho enquanto a tela estiver aberta. Mitigação em camadas: heartbeat detecta conexão morta rápido; reconexão dispara reconciliação; `pull-to-refresh` continua disponível como ação do usuário.
- **Regressão silenciosa em rede ruim** → O maior risco desta mudança. Homologar explicitamente: modo avião com o app aberto, servidor reiniciando, e troca Wi-Fi↔dados.
- **Proxy/CDN interrompendo conexão ociosa** → Heartbeat de ~25s, abaixo dos timeouts usuais.
- **Vazamento de conexões no `Map`** → Remover no `onClose` e no `onError`, e apagar a chave do usuário quando o `Set` esvazia.
- **Ticket na URL** → Uso único, ≤60s, só sobre `wss`. Não é credencial reutilizável e não some da necessidade: é o custo de o navegador não aceitar headers no handshake.
- **Duas versões do app em produção ao mesmo tempo** → A antiga faz polling, a nova usa eventos; ambas leem o mesmo banco pelos mesmos endpoints. Convivem sem interferência.

## Migration Plan

1. **Backend primeiro, sozinho.** Ticket, `/ws`, registro e publicação de eventos são todos aditivos. Depois desse deploy nada muda para nenhum app instalado: a APK antiga segue no polling, e o app novo ainda não existe.
2. **Confirmar no Render** que `wss://appsantiago.onrender.com/ws` aceita conexão e sobrevive a alguns minutos ocioso.
3. **Mobile depois**: cliente de realtime, telas assinando eventos e, no mesmo commit, a remoção dos dois `setInterval`.
4. **Homologar** em Android Studio e Web, com dois usuários simultâneos (A envia, B recebe), e os cenários de rede ruim listados nos riscos.

**Rollback**: reverter o app para o commit anterior devolve o polling, porque os endpoints REST nunca foram tocados. No backend, basta parar de registrar a rota `/ws` — os handlers de chat continuam corretos sem a publicação, já que ela é complementar.

## Open Questions

- O plano atual do Render suporta WebSocket e a mudança no consumo de horas é aceitável? **Precisa ser respondido antes do deploy do backend** — é a única questão bloqueante.
- A conexão deve ser aberta apenas nas telas de chat, ou no layout privado inteiro (antecipando badges em tempo real depois)? O desenho por assinantes permite decidir isso depois sem retrabalho; a proposta atual é começar restrito às telas de chat.
- Vale limitar o número de conexões simultâneas por usuário? Provavelmente desnecessário no volume atual, mas é o tipo de coisa que só aparece em produção.
