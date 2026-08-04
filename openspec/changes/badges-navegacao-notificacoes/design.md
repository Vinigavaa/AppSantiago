## Context

A base já existe e não precisa ser reinventada:

- `Notification` (Prisma) guarda `userId`, `type`, `readAt`. Já é criada nos fluxos de proposta, contrato, serviço e avaliação (`proposals/handlers.ts`, `contracts/handlers.ts`, `professional/services-handlers.ts`, `reviews/handlers.ts`).
- `GET /notifications` já devolve `unreadCount` global e `POST /notifications/read` marca tudo como lido.
- `GET /chats` já calcula `totalUnread` de mensagens não lidas, com filtro de usuários bloqueados.
- A navegação inferior é um `<Tabs>` do expo-router em `src/app/(private)/_layout.tsx`, com duas variantes (cliente e profissional) e `tabBarIcon` construído por `tabIcon()`.
- O app é 100% polling: as telas recarregam via `useFocusEffect`. Não há WebSocket nem cache global de servidor (sem React Query).

Restrições relevantes:

- A APK que o cliente está testando não pode quebrar. Qualquer mudança de contrato precisa ser aditiva.
- O projeto pede simplicidade: nada de camada de estado nova, biblioteca de cache ou realtime.
- O visual da barra não pode mudar de altura nem de espaçamento — o cálculo de `TAB_BAR_CONTENT_HEIGHT + insets.bottom` já foi ajustado para acomodar rótulo com fonte grande.

## Goals / Non-Goals

**Goals:**
- Indicador por aba, ligado à área que realmente tem novidade, para cliente e profissional.
- Contagem correta, sem duplicar mensagens entre chat e notificações.
- Atualização automática com o app aberto, sem o usuário sair da tela.
- Sumiço automático ao visualizar a área.
- Zero mudança de schema e zero quebra da APK instalada.

**Non-Goals:**
- Realtime por WebSocket/SSE.
- Badge no ícone do app (contador do sistema operacional).
- Marcação individual de notificação como lida (a central continua marcando em lote).
- Preferências de notificação por tipo.
- Reescrever a central de notificações ou o sino da home.

## Decisions

### 1. Derivar a área do tipo, em vez de criar coluna `area`

O `NotificationType` já discrimina o que aconteceu. Um mapa `tipo × perfil → área` em `apps/api/src/modules/notifications/areas.ts` resolve a associação sem migration, sem backfill e sem risco para as notificações que já estão no banco.

*Alternativa considerada:* coluna `area` na tabela `Notification`. Exigiria migration, backfill e disciplina em todos os pontos de criação — quatro módulos diferentes. Ganho nenhum enquanto o mapa couber em uma tabela de sete linhas.

O mapa depende do perfil porque o mesmo tipo cai em abas diferentes: `PROPOSAL_ACCEPTED` é "Propostas" para o cliente e "Dashboard" para o profissional. O handler já tem `user.role` na sessão.

### 2. Mensagens vêm do chat, não da tabela de notificações

`MESSAGE_RECEIVED` existe para alimentar o push e a central, mas é marcada como lida em bloco e não sabe *qual* conversa foi aberta. A fonte de verdade real é `Message.readAt`, que o `listMessagesHandler` já atualiza ao abrir a conversa.

Então: `badges.messages` = total de mensagens não lidas (mesma regra do `GET /chats`, incluindo o filtro de bloqueados). As notificações `MESSAGE_RECEIVED` nunca entram na contagem de badges.

Consequência prática desejada: abrir a lista de conversas não zera o indicador — ele diminui conforme cada conversa é aberta, que é o comportamento que o usuário espera.

Para não duplicar a query, extrair de `chat/handlers.ts` uma função `countUnreadMessages(userId)` usada pelo handler de badges e pelo `listChatsHandler`.

### 3. Um endpoint dedicado, não um campo novo em `GET /notifications`

`GET /notifications/badges` devolve só as contagens. É chamado com frequência (poll), então deve ser barato: duas queries agregadas, sem carregar linhas.

*Alternativa considerada:* devolver os badges dentro de `GET /notifications`. Rejeitada porque esse endpoint carrega até 50 notificações completas — caro demais para chamar a cada 45 segundos.

Formato fixo, com todas as chaves sempre presentes:

```json
{ "badges": { "proposals": 0, "messages": 0, "services": 0, "dashboard": 0, "profile": 0 } }
```

Chaves fixas evitam `undefined` no cliente e permitem que o app simplesmente ignore as áreas que não existem no perfil dele.

### 4. `POST /notifications/read` ganha `area` opcional

Sem corpo → marca tudo (comportamento atual, que a APK instalada usa). Com `{ "area": "proposals" }` → marca só os tipos daquela área para aquele perfil. `area` desconhecida → `400 INVALID_DATA`.

*Alternativa considerada:* endpoint novo `POST /notifications/read/:area`. Rejeitada: duplicaria a lógica de marcação por uma diferença que cabe em um parâmetro.

A central de notificações (tela do sino) continua chamando sem `area` — ela mostra tudo, então marcar tudo é o comportamento correto.

### 5. Estado no cliente: um Context com poll, montado no layout privado

`NotificationBadgesProvider` envolve o `<Tabs>` em `src/app/(private)/_layout.tsx`. Ele expõe:

```ts
{ badges: Badges, markAreaRead: (area: BadgeArea) => void, refresh: () => void }
```

Revalidação:
- `setInterval` de 45s enquanto o app está em primeiro plano.
- `AppState` → ao voltar para `active`, revalida imediatamente e religa o intervalo; ao ir para background, limpa o intervalo.
- Listener de push já existente (`features/notifications/push.ts`) chama `refresh()` quando uma notificação chega com o app aberto.

45s é o equilíbrio entre "parece instantâneo" e "não castiga o plano do Render". Push cobre o caso urgente; o poll cobre quando o push não chegou (Expo Go, permissão negada, emulador).

*Alternativa considerada:* `useFocusEffect` por tela, como o resto do app. Não serve: o requisito é justamente atualizar sem trocar de tela.

`markAreaRead(area)` zera a contagem no estado local **antes** da resposta do servidor (atualização otimista) e dispara o `POST` em segundo plano. Se falhar, não exibe erro — a próxima revalidação restaura a verdade. Um badge que reaparece é bem menos ruim que um alerta de erro para algo que o usuário não pediu.

### 6. Ligação tela ↔ área

Cada tela dona de uma área chama `markAreaRead` no `useFocusEffect`:

| Tela | Área |
| --- | --- |
| `proposals.tsx` (cliente) | `proposals` |
| `dashboard.tsx` (profissional) | `dashboard` |
| `services.tsx` (profissional) | `services` |
| `profile.tsx` | `profile` |

`messages` não chama nada: a contagem cai sozinha quando `listMessagesHandler` marca as mensagens da conversa como lidas — basta o `refresh()` seguinte.

### 7. Indicador visual

`src/components/ui/TabBadge.tsx`: um `<View>` absoluto sobre o ícone, `colors.accent` de fundo, texto branco de 10px, `1..9` ou `9+`. Sem contagem confiável não se aplica aqui — todas as áreas têm número —, então o componente sempre mostra número.

Renderizado dentro do `tabBarIcon`, não via `tabBarBadge` da biblioteca: `tabBarBadge` tem tipografia e posicionamento próprios que destoam do resto da barra, e o requisito é manter o padrão visual atual. Como consequência, `tabIcon()` passa a receber a área da aba e ler o contexto.

## Risks / Trade-offs

- **Poll de 45s adiciona carga à API do Render** → a query é `count` agregado com índice em `userId`; e o intervalo só roda com o app em primeiro plano.
- **Atraso de até 45s quando o push não chega** → aceitável para o volume atual (dezenas a poucas centenas de usuários). Se incomodar, o intervalo é uma constante única.
- **`SYSTEM` cai em "Perfil"** → é a aba mais neutra e presente nos dois perfis. Se surgir um tipo de sistema realmente relevante, o mapa é o único lugar a mudar.
- **Atualização otimista pode esconder uma pendência por até 45s** se o `POST` falhar → o usuário acabou de abrir a tela e viu o conteúdo; o custo é baixo e a verdade volta na revalidação.
- **Duas fontes de verdade para "não lido"** (`Notification.readAt` e `Message.readAt`) → mitigado pela regra rígida de que `MESSAGE_RECEIVED` nunca entra na contagem de badges. Isso precisa estar comentado no mapa de áreas, senão alguém adiciona depois e a contagem dobra.

## Migration Plan

1. Backend primeiro: `areas.ts`, handler de badges, `area` opcional no read, rota registrada. Deploy em `main` (Render). Tudo aditivo — a APK instalada não percebe.
2. Mobile depois: provider, `TabBadge`, ligação nas telas.
3. Rollback: remover o provider do layout privado devolve a barra ao estado atual. O endpoint novo pode ficar sem uso, sem efeito colateral.

## Open Questions

- `SERVICE_UPDATED` para o cliente foi mapeado em `proposals`, já que é lá que ele acompanha o andamento do serviço contratado. Confirmar durante a implementação se a tela de propostas é mesmo onde o cliente vê essa atualização.
