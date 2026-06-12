# Santiago

Marketplace de servicos com app Expo/React Native como cliente e API Node separada para autenticacao, Prisma e acesso ao Neon PostgreSQL.

## Arquitetura

Estrutura atual:

```txt
apps/
  api/

packages/
  database/

src/
  app Expo/React Native atual
```

Estrutura alvo futura:

```txt
apps/
  mobile/
  api/

packages/
  database/
  schemas/
  utils/
```

O app mobile nao acessa Prisma, Neon ou variaveis secretas. Ele chama a API HTTP publica configurada em `EXPO_PUBLIC_AUTH_BASE_URL`.

Fluxo:

```txt
App mobile
  -> apps/api
  -> Better Auth
  -> Prisma
  -> Neon PostgreSQL
```

## Autenticacao

A autenticacao roda apenas em `apps/api` com Better Auth. O mobile usa o client em `src/lib/auth-client.ts`, com sessao persistida pelo plugin Expo usando `expo-secure-store`.

Arquivos principais:

- `apps/api/src/modules/auth/auth.ts`: configuracao do Better Auth, roles, criacao de perfis, verificacao de email e reset de senha.
- `apps/api/src/modules/auth/auth-urls.ts`: helper centralizado para montar URLs de verificacao, reset e callbacks confiaveis.
- `apps/api/src/modules/auth/public-sign-up-guard.ts`: bloqueia `ADMIN` e campos internos no cadastro publico.
- `apps/api/src/modules/auth/email-verification-guard.ts`: rejeita token de verificacao ausente, expirado ou reutilizado; redireciona para landing page se `callbackURL` estiver presente.
- `apps/api/src/modules/auth/email-verification-tokens.ts`: armazena hash do token de verificacao de email para garantir uso unico.
- `apps/api/src/http/rate-limit.ts`: rate limit persistido em banco.
- `apps/api/src/http/landing-pages.ts`: paginas HTML servidas pela API para `/auth/email-verified` (sucesso/erro) e `/auth/reset-password` (fallback web).
- `apps/api/src/services/email-service.ts`: envio via Resend (HTTP REST). Em desenvolvimento aceita `EMAIL_PROVIDER=console`.
- `apps/api/src/services/email-templates.ts`: templates HTML/text para verificacao de email e reset de senha.
- `src/features/auth/services/auth-service.ts`: chamadas do mobile para Better Auth/API.
- `src/features/auth/hooks/useAuth.ts`: fluxo das telas e redirecionamentos.
- `src/features/auth/schemas/auth-schemas.ts`: validacao Zod dos formularios.
- `src/app/(private)/_layout.tsx`: bloqueio de rotas privadas por sessao.

Endpoints principais:

```txt
GET  /health
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-in/username
GET  /api/auth/get-session
POST /api/auth/sign-out
POST /api/auth/request-password-reset
POST /api/auth/reset-password
GET  /api/auth/verify-email
POST /api/auth/send-verification-email
```

## Regras De Seguranca

Cadastro publico:

- Aceita apenas `CLIENT` e `PROFESSIONAL`.
- Bloqueia `ADMIN` com `403`.
- Rejeita campos internos como `id`, `emailVerified`, `passwordHash`, `createdAt` e `updatedAt`.
- Forca `emailVerified=false` no hook de criacao do usuario.
- `ADMIN` deve ser criado somente por seed, script administrativo controlado ou area administrativa protegida futura.

Email:

- O usuario recebe email de confirmacao apos cadastro.
- O token de verificacao e armazenado como hash.
- O token expira em 1 hora.
- O token e de uso unico.
- Login exige email verificado; por consequencia, rotas privadas e operacoes autenticadas tambem exigem email verificado.

Senha:

- Reset de senha usa token gerado pelo Better Auth.
- O token expira em 1 hora.
- O token e de uso unico.
- Sessoes antigas sao revogadas apos reset.

Rate limit:

- Login por IP: `8/min`.
- Login por identificador: `12/15min`.
- Cadastro por IP: `5/10min`.
- Reset de senha por IP: `4/15min`.
- Solicitacao de reset por email: `3/h`.
- Verificacao de email por IP: `6/15min`.
- Os contadores ficam na tabela `RateLimitBucket`, compartilhados por todas as instancias da API.

## Variaveis De Ambiente

Raiz do projeto, usada pelo app mobile:

```env
EXPO_PUBLIC_AUTH_BASE_URL="http://localhost:3333"
```

API, em `apps/api/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=verify-full"
BETTER_AUTH_SECRET="generate-a-random-secret-with-at-least-32-characters"
BETTER_AUTH_URL="http://localhost:3333"
API_PORT="3333"
CORS_ORIGIN="http://localhost:8081"
APP_DEEP_LINK_SCHEME="santiago"
# APP_WEB_URL="https://app.seudominio.com" # opcional, habilita link de fallback no email
EMAIL_PROVIDER="console"          # use "resend" em producao
EMAIL_FROM="Santiago <no-reply@santiago.local>"
# EMAIL_REPLY_TO="suporte@seudominio.com" # opcional
RESEND_API_KEY=""
```

Em producao, `EMAIL_PROVIDER=console` e bloqueado. Configure Resend e HTTPS publico:

```env
EXPO_PUBLIC_AUTH_BASE_URL="https://api.seudominio.com"
BETTER_AUTH_URL="https://api.seudominio.com"
EMAIL_PROVIDER="resend"
EMAIL_FROM="Santiago <no-reply@seudominio.com>"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Importante:

- O dominio do `EMAIL_FROM` precisa estar verificado em https://resend.com/domains.
  Sem dominio verificado, a Resend so aceita envios para o email do dono da conta
  (e o `from` precisa ser `onboarding@resend.dev`).
- `APP_DEEP_LINK_SCHEME` casa com `scheme` do `app.json` do Expo. Os links de
  reset de senha usam esse esquema.
- Nunca coloque `DATABASE_URL`, `BETTER_AUTH_SECRET` ou `RESEND_API_KEY` no app mobile.

## Banco De Dados

Arquivos principais:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations`
- `packages/database/prisma/seed.ts`
- `packages/database/src/client.ts`

Tabelas de autenticacao e seguranca:

- `User`
- `Account`
- `Session`
- `Verification`
- `RateLimitBucket`
- `ClientProfile`
- `ProfessionalProfile`

Tabelas do marketplace:

- `Category`
- `City`
- `ServiceRequest`
- `Proposal`
- `ServiceContract`
- `Review`
- `Chat`
- `Message`
- `Notification`
- `ProfessionalPortfolioItem`

## Comandos

Instalar dependencias:

```bash
pnpm install
```

Rodar API:

```bash
pnpm api:dev
```

Rodar app mobile:

```bash
pnpm start
```

Validar TypeScript da API:

```bash
pnpm api:typecheck
```

Gerar Prisma Client:

```bash
pnpm db:generate
```

Aplicar migrations:

```bash
pnpm db:migrate
```

Criar migrations em desenvolvimento:

```bash
pnpm db:migrate:dev
```

Rodar seed:

```bash
pnpm db:seed
```

Validar Prisma:

```bash
pnpm db:validate
```

Smoke test de seguranca da autenticacao (forca provider console para nao bater
na Resend com emails de teste):

```bash
EMAIL_PROVIDER=console npm run auth:smoke
```

Sem o `EMAIL_PROVIDER=console` o teste ainda passa, mas a Resend rejeita os
emails de `@example.com` (HTTP 403) e os erros poluem o output.

Como esta maquina esta usando npm, os equivalentes tambem funcionam:

```bash
npm install
npm run api:dev
npm run start
npm run api:typecheck
npm run db:generate
npm run db:migrate
npm run db:migrate:dev
npm run db:seed
npm run db:validate
```

## Producao

Antes de publicar o app em lojas:

- Hospede `apps/api` em HTTPS publico.
- Configure `BETTER_AUTH_URL` com o mesmo dominio HTTPS.
- Configure `EXPO_PUBLIC_AUTH_BASE_URL` no app apontando para a API publica.
- Verifique o dominio em https://resend.com/domains e ajuste `EMAIL_FROM`.
- Configure `RESEND_API_KEY` (chave de producao) e `EMAIL_PROVIDER=resend`.
- Defina `APP_WEB_URL` se houver uma landing web — habilita o fallback nos emails.
- Mantenha `DATABASE_URL`, `BETTER_AUTH_SECRET` e `RESEND_API_KEY` somente no backend.
- Crie `ADMIN` apenas por seed/script controlado ou painel administrativo protegido.
- Configure observabilidade para erros de autenticacao, abuso e entrega de email.
