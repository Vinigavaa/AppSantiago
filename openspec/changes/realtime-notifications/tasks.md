## 1. Contrato do evento

- [x] 1.1 Adicionar `notification:new` ao `RealtimeEvent` em `apps/api/src/modules/realtime/types.ts`, com o payload `{ id, type, area, title, message }`
- [x] 1.2 Espelhar o mesmo evento em `src/features/realtime/types.ts` (o comentário do arquivo do servidor já exige que os dois andem juntos)

## 2. Ponto único de fan-out no backend

- [x] 2.1 Criar `apps/api/src/modules/notifications/notify.ts` com `notify({ userId, type, title, message })`: persistir, publicar `notification:new` e enviar push, nessa ordem
- [x] 2.2 Resolver a `area` dentro do `notify()` usando `areaForNotification` com o `role` do destinatário, buscando o role quando não vier do fluxo de origem
- [x] 2.3 Garantir que socket e push nunca derrubem a operação de origem: falha só registra log
- [x] 2.4 Expor uma variante para múltiplos destinatários (`notifyMany`), usada no aceite de proposta e na exclusão de solicitação

## 3. Migração dos handlers

- [x] 3.1 `proposals/handlers.ts`: envio de proposta (`PROPOSAL_RECEIVED`) passa a usar `notify()`
- [x] 3.2 `proposals/handlers.ts`: aceite (`PROPOSAL_ACCEPTED` + `PROPOSAL_REJECTED` dos não escolhidos) publicando após o commit da transação
- [x] 3.3 `proposals/handlers.ts`: recusa (`PROPOSAL_REJECTED`)
- [x] 3.4 `contracts/handlers.ts`: cancelamento pelo profissional, cancelamento pelo cliente e não comparecimento
- [x] 3.5 `professional/services-handlers.ts`: serviço iniciado e serviço concluído
- [x] 3.6 `reviews/handlers.ts`: avaliação recebida (`REVIEW_RECEIVED`)
- [x] 3.7 Conferir que nenhum handler chama mais `prisma.notification.create` ou `sendPushToUser` diretamente

## 4. Aviso de exclusão de solicitação

- [x] 4.1 Em `service-requests/handlers.ts`, carregar os profissionais com proposta pendente antes da exclusão (os dados somem em cascata)
- [x] 4.2 Emitir a notificação via `notifyMany` após a exclusão ser confirmada, sem emitir nada quando a exclusão é recusada por contrato ativo

## 5. Ampliação da cobertura de aviso

- [x] 5.1 Incluir `PROPOSAL_RECEIVED` e `REVIEW_RECEIVED` em `ALERT_TYPES` (`apps/api/src/modules/notifications/areas.ts`)
- [x] 5.2 Adicionar os tons correspondentes em `ALERT_TONE` (`src/features/notifications/badges-types.ts`), incluindo o tom da mensagem de chat

## 6. Provider de badges dirigido por evento

- [x] 6.1 Assinar `notification:new` no `NotificationBadgesProvider`: incrementar a contagem da `area` do evento e disparar o toast na hora
- [x] 6.2 Trocar o poll pela reconciliação: `useRealtimeConnection(refresh)` no lugar do `setInterval`
- [x] 6.3 Remover `POLL_INTERVAL_MS`, o `setInterval` e o listener próprio de `AppState` (o cliente realtime já cuida do ciclo de vida)
- [x] 6.4 Manter o `alertedIds` e atualizar o comentário: ele agora deduplica socket contra reconciliação, não poll contra push
- [x] 6.5 Revisar `useMarkAreaRead` e a condição `badges[area] > 0` — verificar o que continua necessário agora que o aviso não é mais derivado de estado, e remover o que virou código morto

## 7. Mensagem de chat no badge e no toast

- [x] 7.1 Assinar `message:new` no provider: incrementar `badges.messages` sem requisição adicional
- [x] 7.2 Registrar o `chatId` da conversa aberta no contexto (montagem/desmontagem da tela de chat)
- [x] 7.3 Suprimir o toast quando o `chatId` do evento for o da conversa aberta
- [x] 7.4 Confirmar que a contagem de `messages` continua vindo de `Message.readAt` e não passou a ser contada em dobro

## 8. Limpeza

- [x] 8.1 Substituir o `fetchNotifications` completo em `useUnreadNotifications` (`src/features/notifications/hooks.ts`) pelo endpoint enxuto de badges, eliminando a duplicação
- [x] 8.2 Remover imports, tipos e comentários que ficaram obsoletos com a saída do poll

## 9. Validação

- [ ] 9.1 Android Studio, dois usuários (cliente e profissional): confirmar badge e toast em menos de 300ms para cada evento da matriz de cobertura
- [ ] 9.2 Verificar a supressão do toast na conversa aberta e o incremento correto do badge fora dela
- [ ] 9.3 Derrubar a conexão (avião/rede) durante um evento e confirmar que a reconciliação traz badge e toast na volta
- [ ] 9.4 Confirmar que uma conexão estável por vários minutos não gera nenhuma requisição de contagem
- [ ] 9.5 Web: repetir o caminho principal (proposta recebida, aceite, mensagem)
- [ ] 9.6 Compatibilidade: confirmar que `GET /notifications/badges` mantém o formato e que a versão anterior do app continua funcionando
