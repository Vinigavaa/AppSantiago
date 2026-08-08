## Context

O app já bloqueia usuários (`UserBlock`, `apps/api/src/modules/blocks/`, tela
`blocked-users.tsx`), mas não tem denúncia, filtro de conteúdo nem qualquer ação de
moderação. A regra 1.2 da App Store exige os quatro itens juntos.

Restrições que moldam o desenho:

- Não existe painel administrativo nem front-end web autenticado. O enum `UserRole`
  tem `ADMIN`, mas nada no app consome esse papel.
- A API é um serviço Hono em `apps/api`, com rotas concentradas em
  `modules/app-routes.ts` e autenticação por `modules/shared/require-auth.ts`.
- O mobile é Expo/expo-router na raiz (`src/`), com features em `src/features/`.
- O sistema está em fase inicial, para dezenas a poucas centenas de usuários: o volume
  de denúncias esperado é de unidades por semana.
- Já existem infra de e-mail (Resend), rate limit por IP (`http/rate-limit.ts`) e
  páginas legais servidas pela API (`http/legal-pages.ts`).

## Goals / Non-Goals

**Goals:**
- Denunciar usuário e conteúdo a partir de todas as superfícies em que o conteúdo aparece.
- Rejeitar automaticamente texto ofensivo no backend, antes de persistir.
- Permitir ao operador ocultar conteúdo e suspender usuário sem tocar no banco à mão.
- Fechar o ciclo em até 24h e deixar isso explícito nos Termos e ao denunciante.
- Manter o backend independente do mobile e todas as regras críticas no servidor.

**Non-Goals:**
- Painel administrativo web ou app de moderação.
- Moderação automática de imagens (add-on pago da Cloudinary) — imagens são tratadas
  por denúncia manual.
- Classificação por IA, escalonamento por número de denúncias, fila de trabalho,
  histórico de reincidência com pontuação.
- Exclusão permanente de conteúdo: a moderação oculta e preserva para auditoria.
- Aviso ao autor do conteúdo removido nesta entrega (fica para uma segunda rodada).

## Decisions

### 1. Um modelo `ContentReport` polimórfico, não uma tabela por alvo

`ContentReport` guarda `targetType` (enum) + `targetId` (uuid), sem relação forte para
cada tabela. Alternativa considerada: colunas nulas por tipo (`messageId`, `reviewId`…)
com FK real. Rejeitada porque multiplica colunas e migrations a cada novo alvo, para
um ganho de integridade que o volume atual não justifica. A existência do alvo é
validada no handler antes de gravar; a ferramenta de moderação resolve o conteúdo por
tipo em um `switch` de uma função só.

Índice único `(reporterId, targetType, targetId)` dá a idempotência da denúncia
repetida via `upsert`, no mesmo padrão já usado em `blockUserHandler`.

### 2. Ocultação por coluna `hiddenAt`/`hiddenReason`, não por exclusão

Cada tabela com conteúdo de usuário (`Message`, `Review`, `ServiceRequest`,
`ProfessionalPortfolioItem`) ganha `hiddenAt DateTime?` e `hiddenReason String?`. As
leituras da API acrescentam `hiddenAt: null` ao `where`. Alternativa: apagar o registro.
Rejeitada porque destrói a evidência e quebra relações (contrato, chat, avaliação).

Consequência a tratar na implementação: a média de avaliações e os contadores derivados
precisam excluir registros ocultos — hoje esses cálculos estão em
`modules/professional/profile-handlers.ts` e `public-profile-handlers.ts`.

### 3. Suspensão barrada em `require-auth`, um ponto só

`User.suspendedAt`/`suspendedReason`. O guard `require-auth.ts` já carrega o usuário da
sessão; ali mesmo ele passa a responder 403 `ACCOUNT_SUSPENDED` com o motivo. É o único
ponto que todas as rotas autenticadas atravessam, então nenhum handler precisa saber
disso. As listagens públicas (busca de profissionais, perfil público, oportunidades)
filtram `suspendedAt: null` por serem os caminhos em que o suspenso apareceria a outros.

No mobile, o `api-client` reconhece `ACCOUNT_SUSPENDED` de forma central, encerra a
sessão e leva à tela de conta suspensa — mesmo padrão de tratamento global já usado
para 401.

### 4. Ferramenta de moderação em CLI, não em rota HTTP

`apps/api/scripts/moderate.ts`, rodado com `npm run moderate -- <comando>`, conectando
pelo `DATABASE_URL`. Comandos: `list`, `show <id>`, `hide <id>`, `suspend <userId>`,
`unsuspend <userId>`, `resolve <id>`, `dismiss <id>`.

Alternativa considerada: rotas `/api/admin/*` com página HTML servida pela API. Rejeitada
para esta entrega: exigiria login web, sessão de admin e uma superfície pública nova, com
risco de autorização, para um volume de casos que uma pessoa resolve em minutos. Se o
volume crescer, as ações do CLI já ficam isoladas em `modules/moderation/actions.ts` e
podem ser expostas por HTTP sem reescrita.

Trade-off aceito: agir exige acesso ao terminal com a env de produção. É o que o prazo
de 24h pede e o operador é uma pessoa só.

### 5. Filtro de texto: lista de termos + normalização, sem serviço externo

`modules/moderation/text-filter.ts` exporta `assertCleanText(text, surface)`. A
normalização é determinística: minúsculas, remoção de acentos (NFD), mapa de leetspeak
(`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `@→a`, `$→s`), colapso de caracteres repetidos e
remoção de separadores entre letras. O casamento é por limite de palavra sobre o texto
normalizado, para não bloquear palavras legítimas que contenham o termo.

A wordlist vive em `modules/moderation/wordlist.ts` como array de strings, comentada e
sem exposição pública. Alternativa considerada: serviço externo de moderação. Rejeitada
por custo, latência em cada mensagem de chat e dependência nova para um problema que
uma lista resolve nesta escala.

Os handlers chamam o filtro na validação, junto do Zod, e retornam
`{ code: "OFFENSIVE_CONTENT" }` com 400 — mesmo formato de erro dos demais handlers.

### 6. Aviso à moderação por e-mail, sem fila

O registro da denúncia dispara `sendReportNotificationEmail` para `MODERATION_EMAIL`. O
envio é feito após a gravação e sua falha só é logada — a denúncia não pode ser perdida
porque o Resend caiu. Não há retry nem fila: o CLI `list` é a fonte de verdade das
pendentes, o e-mail é só o gatilho de atenção.

### 7. UI de denúncia: uma feature reutilizável

`src/features/reports/` com `service.ts`, `types.ts` e `ReportSheet.tsx`. O sheet recebe
`targetType`, `targetId` e o nome do alvo, e é chamado das telas de chat, perfil público,
perfil do cliente, avaliações e oportunidade. Segue `FormSheet` conforme a regra de
teclado do projeto. Após denunciar um `USER`, o sheet oferece bloquear, reaproveitando
`features/blocks/service.ts` — nenhuma lógica de bloqueio é duplicada.

## Risks / Trade-offs

- **Wordlist gera falso positivo e trava um usuário legítimo** → casamento por limite de
  palavra, lista curta e conservadora (apenas termos inequívocos), mensagem de erro que
  permite corrigir o texto sem perder o que foi digitado, e log da superfície para
  ajustar a lista rápido.
- **Wordlist é contornável** (grafias novas, imagens, áudio) → o filtro é a primeira
  camada; a denúncia manual cobre o resto, que é exatamente o desenho que a regra 1.2
  espera. Não prometemos filtro perfeito nos Termos.
- **Denúncia usada como retaliação** → nenhuma ação é automática: toda ocultação e
  suspensão passa por decisão humana no CLI. O limite por usuário evita flood.
- **CLI depende de acesso ao terminal com env de produção** → risco operacional aceito;
  as ações ficam isoladas para virar HTTP depois se o volume exigir.
- **Filtro de `hiddenAt` esquecido em alguma query** → conteúdo removido reaparece. A
  varredura das leituras de `Message`, `Review`, `ServiceRequest` e
  `ProfessionalPortfolioItem` é item explícito das tarefas, e a média de avaliação é
  verificada à parte.
- **Suspensão via `require-auth` não derruba conexão websocket já aberta** → o ticket de
  realtime é emitido por rota autenticada, então a reconexão falha; conexões vivas caem
  no próximo ciclo. Aceitável no volume atual.
- **`MODERATION_EMAIL` ausente em produção** → a env é obrigatória no schema de
  `config/env.ts`, então a API falha no boot em vez de perder denúncias em silêncio.

## Migration Plan

1. Migration Prisma acrescentando `ContentReport`, os três enums, as colunas
   `hiddenAt`/`hiddenReason` e `suspendedAt`/`suspendedReason`. Todas as colunas novas
   são nulas — nenhum backfill, nenhum dado existente muda de comportamento.
2. Deploy da API com o filtro, o endpoint de denúncia e o guard de suspensão. A API nova
   é compatível com a versão do app já instalada: denúncia é rota nova e o filtro só
   rejeita conteúdo que já violaria as regras.
3. Configurar `MODERATION_EMAIL` no Render **antes** do deploy — o boot falha sem ela.
4. Publicar os Termos atualizados (servidos pela própria API, sem release de app).
5. Release do app com os pontos de denúncia e a tela de conta suspensa.
6. Rollback: reverter o deploy da API. As colunas novas ficam no banco sem uso, sem
   quebrar a versão anterior.

## Open Questions

- ~~Endereço definitivo de `MODERATION_EMAIL`~~ — resolvido: `maosaobra@suporte.com.br`,
  a mesma caixa de suporte publicada nos Termos. Uma caixa só evita que uma denúncia
  fique parada num endereço que ninguém abre, e é o endereço que o usuário já conhece
  para contestar uma suspensão.
- Avisar o autor quando o conteúdo dele é ocultado — desejável, mas fora do escopo desta
  entrega. Decidir se entra na próxima rodada.
