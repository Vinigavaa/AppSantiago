## Why

Hoje o usuário só descobre que recebeu uma proposta, uma mensagem ou uma atualização de serviço se abrir cada aba manualmente. A central de notificações existe, mas fica escondida atrás do sino da home e marca tudo como lido de uma vez, sem indicar *onde* está a novidade. O resultado é resposta lenta a propostas e mensagens — justamente as ações que sustentam o marketplace.

## What Changes

- Nova API `GET /notifications/badges`, que devolve a contagem de pendências **por área da navegação inferior** (propostas, mensagens, serviços/dashboard, perfil), para cliente e profissional.
- Cada tipo de notificação passa a ter uma **área** associada. O badge de uma aba conta apenas as notificações não lidas daquela área.
- Mensagens não usam a tabela de notificações como fonte de verdade: o badge de "Mensagens" vem do total de mensagens não lidas do chat, que já existe hoje.
- `POST /notifications/read` ganha um parâmetro opcional `area`. Sem o parâmetro, o comportamento continua sendo marcar tudo como lido (compatível com o app já instalado). Com o parâmetro, marca apenas a área correspondente.
- Novo componente visual `TabBadge` na barra de abas: ponto vermelho quando não há contagem confiável, número (até `9+`) quando há. Mesma cor de destaque e mesmas dimensões do design atual.
- Novo provider `NotificationBadgesProvider` montado no layout privado, que mantém as contagens atualizadas sem o usuário sair da tela: poll leve, revalidação ao voltar do background e revalidação quando chega um push.
- Ao entrar na aba correspondente, o app marca aquela área como lida e o indicador some.

Não há mudança **BREAKING**: o endpoint novo é aditivo e o comportamento padrão do endpoint existente é preservado para a APK já distribuída ao cliente.

## Capabilities

### New Capabilities
- `navigation-badges`: indicadores de pendência por aba na navegação inferior — quando aparecem, o que contam, como somem e como se mantêm atualizados, para cliente e profissional.

### Modified Capabilities
<!-- Nenhuma: o projeto ainda não possui specs consolidadas em openspec/specs/. -->

## Impact

**Backend (`apps/api`)**
- `src/modules/notifications/handlers.ts`: novo handler de badges; `markNotificationsReadHandler` passa a aceitar `area`.
- `src/modules/notifications/areas.ts` (novo): mapa `NotificationType → área`, fonte única compartilhada pelos handlers.
- `src/modules/chat/handlers.ts`: reutilizar a contagem de não lidas já calculada, extraída para função reaproveitável.
- `src/api/…` (registro de rota): nova rota `GET /notifications/badges`.
- Sem migration: nenhuma mudança de schema.

**Mobile (`src`)**
- `src/features/notifications/`: `badges-service.ts`, `badges-context.tsx`, tipos de área.
- `src/app/(private)/_layout.tsx`: provider + `tabBarBadge`/ícone com indicador nas duas variantes de navegação (cliente e profissional).
- `src/components/ui/TabBadge.tsx` (novo).
- Telas de propostas, mensagens, serviços e dashboard: disparam a marcação de leitura da própria área ao ganhar foco.
- `src/features/notifications/push.ts`: listener de push existente passa a invalidar as contagens.

**Compatibilidade**
- APK já instalada no cliente continua funcionando: só chama `POST /notifications/read` sem `area` e ignora o endpoint novo.
