## Why

O app tem conteúdo gerado por usuário (mensagens de chat com foto, perfis, portfólio,
solicitações de serviço e avaliações), mas oferece apenas **bloqueio**. A regra 1.2 da
App Store exige, para esse tipo de app, quatro coisas: filtro de conteúdo ofensivo,
mecanismo de denúncia, bloqueio de usuários abusivos e ação sobre a denúncia em até
24 horas. Sem denúncia e sem filtro a submissão é rejeitada.

## What Changes

- **Denúncia de conteúdo e de usuário**: novo `POST /api/app/reports` aceitando alvo
  (usuário, mensagem, avaliação, solicitação de serviço, item de portfólio), motivo
  (lista fechada) e detalhe opcional. Rate limit por IP e por usuário; denúncia
  repetida do mesmo alvo pelo mesmo denunciante é idempotente.
- **Filtro de conteúdo ofensivo no backend**: todo texto livre enviado por usuário
  (mensagem de chat, descrição de solicitação, bio/profissão, título e descrição de
  portfólio, comentário de avaliação) passa por uma checagem de termos proibidos em
  pt-BR e é rejeitado com mensagem clara antes de ser persistido.
- **Ocultação de conteúdo por moderação**: mensagens, avaliações, solicitações e itens
  de portfólio ganham marcação de ocultado; conteúdo ocultado some das leituras da API.
- **Suspensão de usuário**: usuário suspenso perde acesso ao app (todas as rotas
  autenticadas respondem 403 com motivo) e seu conteúdo deixa de aparecer.
- **Ferramenta de moderação (CLI)**: `npm run moderate` para listar denúncias
  pendentes, ver o conteúdo denunciado, ocultar, suspender, e resolver/arquivar a
  denúncia — sem alteração manual no banco e sem nova superfície pública.
- **Aviso ao denunciante e à moderação**: e-mail para a caixa de moderação a cada
  denúncia e retorno em tela ao denunciante com o compromisso de análise em até 24h.
- **Mobile**: ação "Denunciar" no perfil público do profissional, no perfil do cliente,
  no cabeçalho do chat, no toque longo de uma mensagem, na avaliação e na oportunidade/
  solicitação. Sheet com motivos, campo de detalhe opcional e opção de bloquear junto.
- **Termos de uso**: cláusula de tolerância zero a conteúdo ofensivo e a usuários
  abusivos, descrição do fluxo de denúncia, do prazo de 24h e do contato de suporte.

## Capabilities

### New Capabilities
- `content-reporting`: denúncia de conteúdo e de usuário pelo app — alvos, motivos,
  limites anti-abuso, retorno ao denunciante e aviso à moderação.
- `content-moderation`: ciclo de vida da denúncia e as ações do operador — ocultar
  conteúdo, suspender usuário, resolver denúncia, e o efeito disso nas leituras da API.
- `objectionable-content-filter`: rejeição automática de texto ofensivo nas superfícies
  de conteúdo livre.

### Modified Capabilities
<!-- Nenhuma: openspec/specs/ está vazio; bloqueio e demais fluxos não têm spec registrada. -->

## Impact

- **Banco** (`packages/database/prisma/schema.prisma` + migration): novo modelo
  `ContentReport` e enums `ReportTargetType`, `ReportReason`, `ReportStatus`; colunas
  `hiddenAt`/`hiddenReason` em `Message`, `Review`, `ServiceRequest` e
  `ProfessionalPortfolioItem`; `suspendedAt`/`suspendedReason` em `User`.
- **API**: novo módulo `apps/api/src/modules/reports/`; novo módulo
  `apps/api/src/modules/moderation/` (filtro de texto + ações de moderação); rota em
  `app-routes.ts` com rate limit; `require-auth.ts` passa a barrar usuário suspenso;
  handlers de chat, avaliações, solicitações, oportunidades e perfil público passam a
  filtrar conteúdo ocultado; `email-templates.ts`/`email-service.ts` ganham o aviso de
  denúncia; nova env `MODERATION_EMAIL`.
- **Mobile**: nova feature `src/features/reports/` (serviço, tipos e sheet de denúncia)
  consumida pelas telas de chat, perfil público, perfil do cliente, avaliações e
  oportunidade/solicitação.
- **Legal**: `apps/api/src/http/legal-pages.ts` — seção de conduta e denúncia nos Termos.
- **Operação**: script `apps/api/scripts/moderate.ts` e entrada `moderate` no
  `package.json`; env `MODERATION_EMAIL` configurada no Render.
- **App Store**: destrava a submissão sob a regra 1.2.
