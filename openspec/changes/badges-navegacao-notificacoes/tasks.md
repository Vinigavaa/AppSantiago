## 1. Backend — mapa de áreas

- [x] 1.1 Criar `apps/api/src/modules/notifications/areas.ts` com o tipo `BadgeArea` (`proposals | messages | services | dashboard | profile`) e o mapa `NotificationType × role → BadgeArea`, com fallback para `profile`
- [x] 1.2 Exportar de `areas.ts` um helper `notificationTypesForArea(area, role)` que devolve os tipos daquela área, usado tanto na contagem quanto na marcação de leitura
- [x] 1.3 Comentar no mapa que `MESSAGE_RECEIVED` nunca entra na contagem de badges (a fonte de verdade é `Message.readAt`), para evitar contagem dobrada no futuro

## 2. Backend — contagem de mensagens reaproveitável

- [x] 2.1 Extrair de `listChatsHandler` (`apps/api/src/modules/chat/handlers.ts`) uma função `countUnreadMessages(userId)` que aplica o mesmo filtro de usuários bloqueados
- [ ] 2.2 Fazer `listChatsHandler` usar a função extraída, sem alterar o `totalUnread` já devolvido por `GET /chats`

## 3. Backend — endpoint de badges

- [x] 3.1 Implementar `listNotificationBadgesHandler` em `apps/api/src/modules/notifications/handlers.ts`: agrupar notificações não lidas por tipo (`groupBy`), mapear para áreas via `areas.ts` e somar
- [x] 3.2 Preencher `badges.messages` com `countUnreadMessages(user.id)` e garantir que todas as chaves de área estejam presentes com valor mínimo `0`
- [x] 3.3 Registrar `appRoutes.get("/notifications/badges", listNotificationBadgesHandler)` em `apps/api/src/modules/app-routes.ts`, sob o mesmo middleware de autenticação das demais rotas de notificação
- [ ] 3.4 Verificar manualmente: usuário sem pendências devolve todas as áreas em `0`; requisição sem sessão devolve `401`

## 4. Backend — marcação de leitura por área

- [x] 4.1 Adicionar schema zod com `area` opcional em `markNotificationsReadHandler`, aceitando corpo ausente ou vazio
- [x] 4.2 Sem `area`: manter o `updateMany` atual que marca tudo como lido (compatibilidade com a APK instalada)
- [x] 4.3 Com `area`: restringir o `updateMany` aos tipos de `notificationTypesForArea(area, role)`
- [x] 4.4 Devolver `400 INVALID_DATA` para `area` desconhecida, sem marcar nada
- [ ] 4.5 Verificar manualmente: marcar `proposals` não afeta notificações de `profile`

## 5. Mobile — serviço e estado

- [x] 5.1 Criar `src/features/notifications/badges-types.ts` com `BadgeArea` e o tipo `Badges` (espelho do contrato da API)
- [x] 5.2 Adicionar `fetchNotificationBadges()` e `markAreaRead(area)` em `src/features/notifications/service.ts`, reaproveitando `appFetch`
- [x] 5.3 Criar `src/features/notifications/badges-context.tsx` com `NotificationBadgesProvider` e `useNotificationBadges()`, expondo `{ badges, markAreaRead, refresh }`
- [x] 5.4 Implementar no provider o poll de 45s (constante única no módulo) ativo apenas com o app em primeiro plano
- [x] 5.5 Implementar o listener de `AppState`: revalidar ao voltar para `active` e limpar o intervalo ao ir para background
- [x] 5.6 Implementar `markAreaRead` com atualização otimista (zera local antes da resposta) e falha silenciosa em caso de erro de rede
- [x] 5.7 Garantir que falha de revalidação mantém as últimas contagens conhecidas, sem exibir erro

## 6. Mobile — indicador visual

- [x] 6.1 Criar `src/components/ui/TabBadge.tsx` usando `colors.accent`, texto branco de 10px, posicionado em absoluto sobre o ícone
- [x] 6.2 Exibir `1..9` como número e qualquer valor acima de `9` como `9+`; não renderizar nada quando a contagem é `0`
- [x] 6.3 Confirmar que a barra mantém altura, tamanho de ícone e rótulo idênticos ao estado atual quando não há badge

## 7. Mobile — integração na navegação

- [x] 7.1 Montar `NotificationBadgesProvider` em `src/app/(private)/_layout.tsx`, envolvendo as duas variantes de `<Tabs>`
- [x] 7.2 Estender `tabIcon()` para receber a área da aba e renderizar `TabBadge` a partir do contexto
- [x] 7.3 Aplicar a área nas abas do cliente: `proposals`, `messages`, `profile`
- [x] 7.4 Aplicar a área nas abas do profissional: `dashboard`, `services`, `messages`, `profile`
- [x] 7.5 Confirmar que áreas sem aba no perfil atual são ignoradas (ex.: `dashboard` para o cliente)

## 8. Mobile — sumiço do indicador

- [x] 8.1 Chamar `markAreaRead("proposals")` no `useFocusEffect` da tela de propostas do cliente
- [x] 8.2 Chamar `markAreaRead("dashboard")` no `useFocusEffect` do dashboard do profissional
- [x] 8.3 Chamar `markAreaRead("services")` no `useFocusEffect` da tela de serviços do profissional
- [x] 8.4 Chamar `markAreaRead("profile")` no `useFocusEffect` da tela de perfil (ambos os perfis)
- [x] 8.5 Não marcar `messages` ao abrir a lista: confirmar que o indicador só diminui conforme cada conversa é aberta

## 9. Mobile — atualização por push

- [x] 9.1 Fazer o listener de notificação recebida em `src/features/notifications/push.ts` disparar `refresh()` do contexto quando o app está aberto
- [x] 9.2 Garantir que a ausência de push (Expo Go, emulador, permissão negada) não impede a atualização — o poll continua cobrindo

## 10. Homologação

- [ ] 10.1 Validar no Android Studio, como cliente: proposta recebida com o app aberto na home faz o indicador de "Propostas" aparecer sem interação
- [ ] 10.2 Validar no Android Studio, como profissional: proposta aceita pelo cliente faz o indicador aparecer em "Dashboard", não em "Propostas"
- [ ] 10.3 Validar mensagens: com 3 conversas não lidas, abrir uma reduz a contagem e o indicador permanece
- [ ] 10.4 Validar o retorno do segundo plano: as contagens são revalidadas imediatamente
- [ ] 10.5 Confirmar compatibilidade: `POST /notifications/read` sem corpo continua marcando tudo como lido (comportamento usado pela APK já instalada)
- [ ] 10.6 Rodar `graphify update .` para manter o grafo do projeto atualizado
