## Context

O app tem hoje dois mecanismos de entrega paralelos e desalinhados:

- **Chat**: WebSocket em `/ws`, com ticket de uso único, heartbeat de 25s, backoff exponencial com jitter e reconciliação por conexão. Latência praticamente instantânea.
- **Notificações**: poll de 15s em `badges-context.tsx`, que alimenta tanto os badges da barra inferior quanto os toasts (via o campo `events` de `GET /notifications/badges`). Latência média de 7,5s.

O poll também custa: 4 requisições por minuto por usuário ativo, cada uma disparando três consultas (`groupBy` + `countUnreadMessages` + `findMany`), quase sempre para responder que nada mudou.

Há ainda um efeito colateral de design: o toast é **derivado de estado** (varre notificações não lidas a cada ciclo) em vez de **disparado por evento**. Daí a complexidade defensiva existente — o `Set` de `alertedIds`, a condição `badges[area] > 0` em `useMarkAreaRead` para não destruir um aviso que ainda não virou badge, a corrida entre o foco da tela e o ciclo do poll. Boa parte desse código existe apenas para compensar o fato de o app descobrir os eventos tarde e em lote.

Do lado do servidor, a emissão de notificação está espalhada por seis handlers, cada um repetindo `prisma.notification.create` seguido de `sendPushToUser` com os textos duplicados lado a lado. Sem um ponto único, ligar um terceiro canal significaria editar doze lugares e mantê-los sincronizados manualmente para sempre.

Restrições: API hospedada no Render, instância única; APKs já instalados precisam continuar funcionando; o projeto está em fase inicial e deve evitar complexidade antecipada.

## Goals / Non-Goals

**Goals:**
- Badge e toast em menos de 300ms com a conexão aberta.
- Um único ponto de emissão de notificação no backend, cobrindo persistência, socket e push.
- Cobertura completa dos eventos pedidos para cliente e profissional, incluindo o fluxo de exclusão de solicitação, hoje sem aviso nenhum.
- Reduzir código no app: o poll e as defesas contra corrida saem.
- Zero quebra para versões já instaladas.

**Non-Goals:**
- Redis, pub/sub externo ou qualquer preparo para múltiplas instâncias da API.
- Substituir o push. Ele continua sendo o canal de app fechado; o socket é o canal de app aberto.
- Mudar o mecanismo de conexão, ticket, heartbeat ou backoff — tudo isso já existe e funciona.
- Alterar o modelo de dados ou criar migration.
- Mexer na central de notificações (`/notifications`), que continua com o carregamento por foco.

## Decisions

### 1. Reaproveitar o canal do chat em vez de criar um novo

O socket já resolve os problemas difíceis: autenticação do handshake por ticket de uso único, detecção de conexão zumbi por heartbeat, reconexão com backoff e jitter, suspensão em segundo plano, entrega para múltiplas conexões do mesmo usuário. Criar um canal dedicado a notificações duplicaria tudo isso.

Alternativas descartadas:
- **Diminuir o poll para 2–3s**: multiplica o custo por 5–7 e continua não sendo instantâneo. Pior relação custo/benefício possível.
- **Server-Sent Events**: exigiria uma segunda infraestrutura de conexão persistente ao lado do socket, sem ganho.
- **Depender só do push**: não funciona em emulador nem no Expo Go, depende de permissão concedida e é entrega best-effort. Nunca foi rede de segurança.

### 2. `area` resolvida no servidor, dentro do payload do evento

O servidor já conhece o `role` do destinatário e já mantém o mapa `AREA_BY_TYPE` como fonte única. Mandar a área pronta evita que o app reimplemente esse mapa e o mantenha sincronizado — o mesmo tipo cai em abas diferentes conforme o perfil (`PROPOSAL_ACCEPTED` é `proposals` para o cliente e `services` para o profissional).

O mesmo vale para `title` e `message`: vão prontos, como já acontece em `events`. O app não reescreve conteúdo por tipo, então toast, central e push contam a mesma história.

### 3. `notify()` como ponto único, chamado após o commit

A ordem é: commit da operação de origem → persistir a notificação → publicar no socket → enviar push, tudo dentro do `notify()`.

O plano inicial era manter a persistência dentro da transação de cada handler e publicar depois. Isso exigiria que todo handler convertesse `prisma.$transaction([...])` para transação interativa e devolvesse os registros criados só para que outra função os publicasse — muita cerimônia para o ganho. A notificação saiu da transação e o `notify()` passou a ser chamado logo após ela.

O que se perde: uma queda do processo entre o commit e o `notify()` perde a notificação daquele evento. É a mesma janela que o push já tinha, e que `createProposal` e `sendMessage` já aceitavam. O que se ganha: um único ponto de emissão, uma linha por evento no handler, e a garantia que importa continua valendo — uma transação revertida nunca alcança o `notify()`, então não persiste, não publica e não empurra push.

Falha dentro do `notify()` nunca derruba a operação de origem: tudo é envolvido em try/catch com log, no mesmo espírito de `registry.publish` e `sendPushToUsers`.

O push sai sem `await`: é uma chamada HTTP externa e não deve somar centenas de milissegundos à resposta.

### 4. Mensagem de chat aproveita o evento `message:new` existente

O backend já publica `message:new` para o destinatário. Publicar também um `notification:new` do mesmo fato duplicaria o aviso — por isso o `notify()` do chat desliga a publicação (`publishRealtime: false`), mantendo a persistência (a central e a marcação de leitura dependem dela) e o push.

Única mudança de backend necessária: o evento passou a levar `senderName`. O aviso mostra quem enviou e um trecho, como o push já fazia, e o `ChatMessage` não carrega o nome do remetente.

A contagem de `messages` também continua vindo de `Message.readAt`, não da tabela de notificações — a regra atual, que evita contagem dobrada, permanece intacta.

O toast é suprimido quando o `chatId` do evento é o da conversa aberta na tela. Isso exige que o provider saiba qual conversa está aberta; a forma mais simples é a tela de chat registrar/desregistrar o `chatId` ativo no contexto ao montar e desmontar.

### 5. Reconciliação por conexão substitui o poll

`useRealtimeConnection` já dispara a cada conexão estabelecida, incluindo reconexões e a volta do segundo plano. É exatamente a semântica que o poll tentava aproximar por tempo, mas correta: recarrega quando pode ter havido perda, e não recarrega quando a conexão está estável.

Com isso saem do `badges-context.tsx`: o `setInterval`, o `POLL_INTERVAL_MS` e o listener próprio de `AppState` (o cliente realtime já trata o ciclo de vida do app).

O `alertedIds` **permanece**: continua necessário para não repetir um toast quando o mesmo evento chega pelo socket e volta em `events` na reconciliação seguinte. Muda o motivo, não a necessidade.

### 6. `GET /notifications/badges` é mantido intacto

APKs já instalados continuam pollando esse endpoint. Alterar o contrato os quebraria. Ele deixa de ser fonte primária e passa a servir a reconciliação e a compatibilidade retroativa — mas o formato não muda.

### 7. Registro de conexões continua em memória

Uma instância da API. O `registry.ts` já documenta esse limite e já isola o ponto de troca: os handlers conhecem apenas `publish`. Quando houver segunda instância, trocar a implementação de `publish` por Redis pub/sub não toca em nenhum handler de domínio. Fazer isso agora seria complexidade antecipada para um problema que não existe.

## Risks / Trade-offs

**Uma instância só** → Já é a realidade da API hoje e está documentado no `registry.ts`. O ponto de troca está isolado em um arquivo. Aceito conscientemente.

**Cold start / spin down do Render derruba as conexões** → O backoff exponencial com jitter e o heartbeat já tratam isso, e a reconciliação por conexão recupera o que passou durante a queda. É o mesmo comportamento que o chat já tem em produção.

**Evento perdido se o socket cair entre o commit e a publicação** → A notificação está persistida; a reconciliação da próxima conexão a recupera. Nenhuma informação se perde, só a instantaneidade daquele evento específico.

**Toast de mensagem pode virar ruído em conversa movimentada** → Mitigado suprimindo o toast na conversa aberta e mantendo a fila de um toast por vez, que já existe. Se ainda incomodar em uso real, o ajuste fica contido no provider.

**Migração dos seis handlers pode alterar semântica de transação** → Mitigado migrando um handler por vez, cada um verificável isoladamente, e mantendo a persistência dentro da transação original em todos os casos.

**Regressão silenciosa: badge para de atualizar sem ninguém perceber** → Este era o pior modo de falha do chat ao remover o poll, e por isso o heartbeat existe. Ele cobre igualmente as notificações, já que o canal é o mesmo.

**Emulador e Expo Go** → O socket funciona nos dois, diferente do push. Na prática a homologação em Android Studio fica melhor do que hoje, não pior.

## Migration Plan

Deploy em uma etapa, sem migration de banco e sem feature flag — o backend novo atende as duas versões do app ao mesmo tempo.

1. Backend primeiro: `notify()`, o evento `notification:new` e o aviso de exclusão de solicitação. Nesse ponto o app antigo continua funcionando pelo poll, apenas ignorando o evento novo que não conhece.
2. Mobile em seguida: assinatura dos eventos e remoção do poll.

Rollback: reverter o app para a versão anterior restaura o poll integralmente, já que `GET /notifications/badges` nunca deixou de existir. O backend pode permanecer no estado novo — publicar um evento que ninguém escuta é inofensivo.

## Open Questions

Ambas resolvidas antes da implementação:

- **Texto do toast de mensagem**: primeiro nome de quem enviou como título e o trecho da mensagem como corpo, mesma linha do push atual. Mensagem sem texto mostra a indicação de foto. Exigiu levar `senderName` no evento `message:new`.
- **Aviso de exclusão de solicitação**: cita o título da solicitação, para que quem tem várias propostas em aberto saiba qual caiu. O título é lido antes da exclusão, junto com os destinatários.
