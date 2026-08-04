## 1. Backend — correção de área

- [x] 1.1 Em `apps/api/src/modules/notifications/areas.ts`, mudar `PROPOSAL_ACCEPTED` do profissional de `dashboard` para `services`
- [x] 1.2 Atualizar o comentário do mapa explicando por que o aceite pertence a "Serviços" (virou contrato) e o que permanece em "Dashboard" (propostas em disputa)

## 2. Backend — eventos pendentes de aviso

- [x] 2.1 Definir em `areas.ts` a lista `ALERT_TYPES` (`PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`, `SERVICE_UPDATED`), com comentário de por que `MESSAGE_RECEIVED` fica fora
- [x] 2.2 Em `listNotificationBadgesHandler`, buscar as notificações não lidas desses tipos com `orderBy createdAt desc` e `take: 5`, selecionando apenas `id`, `type`, `title` e `createdAt` mais `message`
- [x] 2.3 Devolver `events` na resposta, sempre presente (lista vazia quando não há nada), sem alterar o formato de `badges`
- [x] 2.4 Rodar `npm run typecheck` em `apps/api`

## 3. Backend — mensagem do cancelamento

- [x] 3.1 Em `apps/api/src/modules/contracts/handlers.ts`, no cancelamento pelo profissional, incluir na mensagem da notificação do cliente o ponteiro para a aba "Recusadas" em Propostas
- [x] 3.2 Ajustar o texto do `sendPushToUser` correspondente para ficar coerente com a notificação
- [x] 3.3 Conferir que o motivo informado pelo profissional continua aparecendo quando existe

## 4. Mobile — componente de toast

- [x] 4.1 Criar `src/components/ui/Toast.tsx` com `ToastProvider` e `useToast()`, expondo `showToast({ id, tone, title, message })`
- [x] 4.2 Implementar a fila: apenas o primeiro item é renderizado, os demais aguardam
- [x] 4.3 Dispensa automática após 4s (constante única no módulo) e dispensa imediata ao toque, adiantando o próximo da fila
- [x] 4.4 Posicionar como `View` absoluta no topo, respeitando o `safe area inset`, com `pointerEvents` que não bloqueie a tela abaixo
- [x] 4.5 Aplicar os tons visuais com os tokens de `theme.ts` (`status.success`, `status.danger`, `status.info`) e os ícones Ionicons `checkmark-circle`, `alert-circle` e `information-circle`
- [x] 4.6 Montar `ToastProvider` em `src/app/_layout.tsx`, acima da navegação

## 5. Mobile — ligação com as notificações

- [x] 5.1 Adicionar o tipo `PendingAlert` e o tom por tipo de notificação em `src/features/notifications/badges-types.ts`
- [x] 5.2 Estender `fetchNotificationBadges()` em `service.ts` para ler `events`, tolerando resposta sem o campo (servidor mais antigo)
- [x] 5.3 No `NotificationBadgesProvider`, guardar um `Set` de ids já exibidos e disparar `showToast` apenas para os eventos ainda não vistos
- [x] 5.4 Garantir que exibir o toast não marca nada como lido nem altera as contagens
- [x] 5.5 Confirmar que o mesmo evento vindo do poll e do push gera um único toast

## 6. Verificação

- [x] 6.1 `npx tsc --noEmit` na raiz e em `apps/api` sem erros
- [ ] 6.2 Validar no Android Studio, como profissional: cliente aceita a proposta com o app aberto → toast de sucesso e indicador em "Serviços" (não em "Dashboard")
- [ ] 6.3 Validar que o indicador de "Serviços" permanece até o profissional abrir a aba, mesmo depois de ver o toast
- [ ] 6.4 Validar no Android Studio, como cliente: profissional cancela o serviço → toast de atenção citando a aba "Recusadas", e a proposta está mesmo lá
- [ ] 6.5 Validar que o toast não bloqueia a tela: rolar e tocar em elementos abaixo dele enquanto está visível
- [ ] 6.6 Validar a fila com dois eventos simultâneos: aparecem em sequência, nunca empilhados
- [ ] 6.7 Validar o caso "app fechado": evento acontece com o app fechado, e o toast aparece ao reabrir enquanto a aba não foi visitada
- [ ] 6.8 Confirmar que receber mensagem de chat não gera toast
