## Why

Os indicadores da barra de abas (change `badges-navegacao-notificacoes`) dizem *que* existe algo novo, mas não *o quê*. Nos dois momentos mais críticos do marketplace — a proposta ser aceita e o serviço ser cancelado — o usuário que está com o app aberto merece saber na hora, sem precisar caçar a informação. Hoje ele só descobre abrindo a aba certa ou pelo push, que nem sempre chega (Expo Go, permissão negada, emulador).

## What Changes

- Novo `ToastProvider` + `useToast` em `src/components/ui/`: aviso flutuante no topo, não bloqueante, com fila e dispensa automática.
- `GET /notifications/badges` passa a devolver, além das contagens, os **eventos pendentes de aviso**: as notificações não lidas dos tipos que merecem toast (`PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`, `SERVICE_UPDATED`), com `id`, `type`, `title` e `message`.
- O `NotificationBadgesProvider` passa a exibir toast para cada evento pendente ainda não mostrado nesta sessão. O mesmo poll de 45s e o mesmo listener de push já existentes disparam a checagem — nenhum mecanismo novo de atualização.
- **Correção de mapeamento:** `PROPOSAL_ACCEPTED` do profissional passa de `dashboard` para `services`. Quando o cliente aceita, a novidade é um serviço contratado, e é em "Serviços" que ele aparece.
- A mensagem de cancelamento pelo profissional passa a indicar onde o cliente reencontra a proposta ("aba Recusadas"), no texto da notificação e do push.
- Ícones: **mantido o `@expo/vector-icons` (Ionicons)** já usado nos 48 arquivos do app. Adotar Lucide apenas nesta funcionalidade criaria justamente a mistura de bibliotecas a evitar; Ionicons tem equivalentes diretos (`checkmark-circle`, `alert-circle`, `document-text`, `chatbubble-ellipses`, `notifications`) no mesmo estilo e espessura.

Sem mudança **BREAKING**: o campo `events` é aditivo e a APK instalada continua ignorando o endpoint.

## Capabilities

### New Capabilities
- `in-app-alerts`: avisos imediatos (toast) para eventos que exigem atenção — quando aparecem, para quem, com que conteúdo, como evitam duplicidade e como convivem com o indicador da aba.

### Modified Capabilities
- `navigation-badges`: a área de `PROPOSAL_ACCEPTED` para o profissional muda de `dashboard` para `services`; o endpoint de badges passa a devolver também os eventos pendentes de aviso.

## Impact

**Backend (`apps/api`)**
- `src/modules/notifications/areas.ts`: `PROPOSAL_ACCEPTED` do profissional → `services`.
- `src/modules/notifications/handlers.ts`: `listNotificationBadgesHandler` passa a devolver `events`.
- `src/modules/contracts/handlers.ts`: mensagem do cancelamento pelo profissional ganha o ponteiro para a aba "Recusadas".
- Sem migration.

**Mobile (`src`)**
- `src/components/ui/Toast.tsx` (novo): provider, fila e componente visual.
- `src/app/_layout.tsx`: `ToastProvider` acima da navegação.
- `src/features/notifications/badges-context.tsx`: consome `events` e dispara os toasts.
- `src/features/notifications/badges-types.ts`: tipo `PendingAlert`.

**Dependência de ordem**
- Este change assume `badges-navegacao-notificacoes` já implementado (provider, poll, endpoint de badges e marcação por área). Deve ser arquivado antes ou junto.
