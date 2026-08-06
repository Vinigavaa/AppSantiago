## Why

Badges da navegação inferior e toasts são alimentados por um poll de 15 segundos, o que faz toda novidade demorar 7,5s em média (15s no pior caso) para aparecer — enquanto o chat, no mesmo app, já entrega em tempo real por WebSocket. O canal existe, funciona e é ignorado pela camada de notificações; ao mesmo tempo o poll custa 4 requisições por minuto por usuário ativo, cada uma com três consultas ao banco, quase sempre para responder "nada mudou".

## What Changes

- Notificação passa a ser entregue pelo WebSocket já existente (`/ws`), com badge e toast aparecendo em menos de 300ms.
- Novo evento `notification:new` no contrato realtime, com `area` já resolvida pelo servidor a partir do perfil do usuário.
- Ponto único de fan-out no backend (`notify()`): persistir → publicar no socket → enviar push. Os seis handlers que hoje repetem `prisma.notification.create` + `sendPushToUser` passam a chamar essa função.
- O app deixa de pollar. A reconciliação passa a ocorrer uma vez por conexão estabelecida (cobre reconexão e volta do background), mecanismo que o chat já usa.
- Mensagem de chat passa a alimentar o badge de "Mensagens" e a gerar toast, a partir do evento `message:new` que já existe, que passa a levar também o nome de quem enviou. O toast é suprimido quando o usuário já está na conversa.
- Cobertura de aviso ampliada: `PROPOSAL_RECEIVED`, `REVIEW_RECEIVED` e mensagem de chat passam a gerar toast, com tons próprios.
- Exclusão de solicitação pelo cliente passa a notificar os profissionais com proposta pendente — hoje nenhum aviso é emitido nesse fluxo.
- Remoção do código que existia apenas para compensar a latência do poll (intervalo, listener de `AppState` duplicado, defesas contra corrida entre foco e ciclo).
- `GET /notifications/badges` é mantido: APKs já instalados continuam funcionando pelo poll. Não há quebra de compatibilidade.

## Capabilities

### New Capabilities
- `realtime-notifications`: entrega de notificações pelo canal WebSocket — contrato do evento `notification:new`, ordem de fan-out (persistência, socket, push), comportamento quando o usuário está offline e reconciliação por conexão.

### Modified Capabilities
- `navigation-badges`: a contagem por área deixa de depender do poll e passa a ser atualizada por evento; `GET /notifications/badges` continua existindo, mas como reconciliação por conexão e compatibilidade retroativa, não como fonte primária.
- `in-app-alerts`: o conjunto de eventos que geram toast passa a incluir `PROPOSAL_RECEIVED`, `REVIEW_RECEIVED` e mensagem de chat; o gatilho do toast deixa de ser o estado pendente devolvido pelo poll e passa a ser o evento recebido pelo socket.

## Impact

Backend (`apps/api`):
- Novo `src/modules/notifications/notify.ts` (fan-out único).
- `src/modules/realtime/types.ts`: novo evento `notification:new`.
- `src/modules/notifications/areas.ts`: `ALERT_TYPES` ampliado.
- Handlers migrados para `notify()`: `proposals`, `contracts`, `reviews`, `professional/services-handlers`, `chat`, `service-requests`.
- `src/modules/service-requests/handlers.ts`: notificação nova no fluxo de exclusão.

Mobile (`src`):
- `features/realtime/types.ts`: espelho do novo evento.
- `features/notifications/badges-context.tsx`: poll removido, assinatura de eventos no lugar.
- `features/notifications/badges-types.ts`: novos tons em `ALERT_TONE`.

Sem migration de banco, sem dependência nova, sem Redis. O registro de conexões segue em memória (uma instância da API), com a troca futura por pub/sub contida em `src/modules/realtime/registry.ts`.
