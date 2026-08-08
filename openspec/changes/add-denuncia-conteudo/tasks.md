## 1. Banco de dados

- [x] 1.1 Adicionar ao `packages/database/prisma/schema.prisma` os enums `ReportTargetType` (`USER`, `MESSAGE`, `REVIEW`, `SERVICE_REQUEST`, `PORTFOLIO_ITEM`), `ReportReason` (`SPAM`, `ASSEDIO`, `CONTEUDO_SEXUAL`, `VIOLENCIA`, `DISCURSO_DE_ODIO`, `GOLPE`, `OUTRO`) e `ReportStatus` (`PENDING`, `RESOLVED`, `DISMISSED`)
- [x] 1.2 Adicionar o modelo `ContentReport` (id, reporterId, targetType, targetId, reason, details, status, createdAt, resolvedAt, resolutionNote) com `@@unique([reporterId, targetType, targetId])` e índices por `status` e `createdAt`
- [x] 1.3 Adicionar `hiddenAt` e `hiddenReason` em `Message`, `Review`, `ServiceRequest` e `ProfessionalPortfolioItem`
- [x] 1.4 Adicionar `suspendedAt` e `suspendedReason` em `User`
- [x] 1.5 Gerar a migration e o client Prisma, e conferir que todas as colunas novas são nulas (sem backfill)

## 2. Filtro de conteúdo ofensivo

- [x] 2.1 Criar `apps/api/src/modules/moderation/wordlist.ts` com a lista de termos proibidos em pt-BR (conservadora, só termos inequívocos, comentada)
- [x] 2.2 Criar `apps/api/src/modules/moderation/text-filter.ts` com a normalização (minúsculas, NFD sem acentos, leetspeak, colapso de repetições, remoção de separadores) e `containsOffensiveText`
- [x] 2.3 Expor `assertCleanText(text, surface)` retornando o erro `OFFENSIVE_CONTENT` (400) no mesmo formato dos demais handlers, com log de superfície e userId sem o texto integral
- [x] 2.4 Aplicar o filtro no envio de mensagem (`modules/chat/handlers.ts`), antes de persistir, entregar por websocket ou notificar
- [x] 2.5 Aplicar o filtro na criação e atualização de solicitação (`modules/service-requests/handlers.ts`)
- [x] 2.6 Aplicar o filtro no perfil profissional (bio, profissão, nome de exibição) e na sugestão de categoria (`modules/professional/profile-handlers.ts`)
- [x] 2.7 Aplicar o filtro no perfil do cliente (`modules/client/profile-handlers.ts`) e na criação de item de portfólio (`modules/professional/portfolio-handlers.ts`)
- [x] 2.8 Aplicar o filtro no comentário de avaliação (`modules/reviews/handlers.ts`)
- [x] 2.9 Testar as variações: acento, caixa alta, leetspeak, separadores, repetição, e uma palavra legítima que encapsula um termo (não pode bloquear)

## 3. Denúncia (API)

- [x] 3.1 Criar `apps/api/src/modules/reports/service.ts` com a resolução do alvo por tipo (existe? quem é o autor?) em um único `switch`
- [x] 3.2 Criar `apps/api/src/modules/reports/handlers.ts` com o schema Zod (motivo da lista fechada, detalhe até 500 chars, obrigatório com 10+ chars quando `OUTRO`), recusa de denúncia do próprio conteúdo, 404 para alvo inexistente e `upsert` idempotente
- [x] 3.3 Registrar `POST /api/app/reports` em `modules/app-routes.ts` com rate limit por IP e limite por usuário na janela configurada (429)
- [x] 3.4 Adicionar `MODERATION_EMAIL` (obrigatória) em `apps/api/src/config/env.ts` e documentar em `.env.example`
- [x] 3.5 Criar o template de aviso de denúncia em `services/email-templates.ts` (id, alvo, motivo, detalhe, denunciante) e disparar após a gravação, com falha apenas logada

## 4. Ocultação e suspensão (API)

- [x] 4.1 Criar `apps/api/src/modules/moderation/actions.ts` com `hideContent`, `suspendUser`, `unsuspendUser`, `resolveReport` e `dismissReport` (recusando decisão sobre denúncia que não está `PENDING`)
- [x] 4.2 Barrar usuário suspenso em `modules/shared/require-auth.ts` com 403 `ACCOUNT_SUSPENDED` e o motivo
- [x] 4.3 Filtrar `hiddenAt: null` nas leituras de mensagens (`modules/chat/handlers.ts`, incluindo o preview de última mensagem e a contagem de não lidas em `chat/unread.ts`)
- [x] 4.4 Filtrar `hiddenAt: null` nas avaliações e recalcular nota média e contagem sem as ocultas (`professional/profile-handlers.ts`, `public-profile-handlers.ts`, `client/profile-handlers.ts`)
- [x] 4.5 Filtrar `hiddenAt: null` nas solicitações e oportunidades (`modules/service-requests/handlers.ts`, `modules/professional/handlers.ts`), com mensagem ao cliente quando a própria solicitação foi removida por moderação
- [x] 4.6 Filtrar `hiddenAt: null` nos itens de portfólio (perfil público e perfil próprio)
- [x] 4.7 Filtrar `suspendedAt: null` na busca de profissionais e no perfil público (perfil de suspenso fica indisponível)

## 5. Ferramenta de moderação (CLI)

- [x] 5.1 Criar `apps/api/scripts/moderate.ts` com o comando `list`: pendentes por ordem de chegada, com id, alvo, motivo, denunciante e tempo de espera, destacando no topo as com mais de 24h
- [x] 5.2 Implementar `show <reportId>`: conteúdo denunciado, autor do conteúdo e detalhe do denunciante
- [x] 5.3 Implementar `hide <reportId> [motivo]`, `suspend <userId> <motivo>` e `unsuspend <userId>` chamando `modules/moderation/actions.ts`
- [x] 5.4 Implementar `resolve <reportId> <nota>` e `dismiss <reportId> <nota>`
- [x] 5.5 Encerrar com mensagem clara (sem stack trace cru) quando `DATABASE_URL` está ausente ou o id não existe
- [x] 5.6 Adicionar o script `moderate` ao `package.json` e documentar os comandos no `README.md`

## 6. Mobile — denúncia

- [x] 6.1 Criar `src/features/reports/types.ts` (tipos de alvo e motivos, espelhando a API) e `service.ts` com `reportContent`
- [x] 6.2 Criar `src/features/reports/ReportSheet.tsx` usando `FormSheet` (motivos, detalhe opcional, obrigatório em "Outro"), confirmação com o prazo de 24h e tratamento de erro mantendo o texto digitado
- [x] 6.3 Após denunciar alvo `USER`, oferecer bloquear reaproveitando `features/blocks/service.ts`
- [x] 6.4 Adicionar "Denunciar" no cabeçalho da conversa (`features/chat/components/ChatHeader.tsx`) e no toque longo de mensagem recebida, ocultando a ação nas mensagens do próprio usuário
- [x] 6.5 Adicionar "Denunciar" no perfil público do profissional (`features/professional/PublicProfessionalScreen.tsx`) e no perfil do cliente visto por outro usuário
- [x] 6.6 Adicionar "Denunciar" nas avaliações recebidas e na oportunidade/solicitação (`features/professional/`, `features/service-requests/`)

## 7. Mobile — conta suspensa e conteúdo removido

- [x] 7.1 Tratar `ACCOUNT_SUSPENDED` de forma central em `src/lib/api-client.ts`
- [x] 7.2 Criar a tela/estado de conta suspensa exibindo o motivo e o contato de suporte, encerrando a sessão local
- [x] 7.3 Exibir ao cliente que a própria solicitação foi removida por moderação, em vez de sumir sem explicação

## 8. Termos de uso e conformidade

- [x] 8.1 Acrescentar em `apps/api/src/http/legal-pages.ts` a política de tolerância zero a conteúdo ofensivo e a usuários abusivos
- [x] 8.2 Descrever nos Termos o fluxo de denúncia, o prazo de análise de 24h, as consequências possíveis e o e-mail de contato
- [x] 8.3 Atualizar a data de última atualização dos Termos

## 9. Verificação

- [x] 9.1 Rodar a migration em ambiente local e conferir o schema
- [ ] 9.2 Testar o fluxo ponta a ponta no Android Studio: denunciar mensagem, perfil, avaliação e solicitação; conferir o e-mail de aviso
- [x] 9.3 Testar o CLI: listar, inspecionar, ocultar, suspender, reativar, resolver e descartar
- [x] 9.4 Conferir que conteúdo ocultado some de todas as leituras (chat, avaliações, média, oportunidades, portfólio) e que o suspenso perde acesso e some das listagens
- [x] 9.5 Conferir a rejeição do filtro em todas as superfícies e a ausência de falso positivo em textos legítimos
- [ ] 9.6 Configurar `MODERATION_EMAIL` no Render antes do deploy (a API não sobe sem ela)
