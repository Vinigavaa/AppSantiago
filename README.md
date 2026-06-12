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

## API

A API fica em `apps/api` e usa:

- Hono
- Better Auth
- Prisma via `packages/database`
- Neon PostgreSQL

Endpoints principais:

```txt
GET  /health
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-in/username
GET  /api/auth/get-session
POST /api/auth/sign-out
```

O cadastro publico aceita apenas `CLIENT` e `PROFESSIONAL`. Se alguem tentar enviar `ADMIN`, o backend salva como `CLIENT`. Usuarios `ADMIN` devem ser criados futuramente por seed seguro ou rotina administrativa protegida.

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
```

Nunca coloque `DATABASE_URL` ou `BETTER_AUTH_SECRET` no ambiente do app mobile. Apenas variaveis `EXPO_PUBLIC_*` podem ir para o cliente.

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
```

## Banco De Dados

Arquivos principais:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations`
- `packages/database/prisma/seed.ts`
- `packages/database/src/client.ts`

Tabelas de autenticacao:

- `User`
- `Account`
- `Session`
- `Verification`
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

## Producao

Para publicar o app em loja, a API deve estar em HTTPS publico, por exemplo:

```env
EXPO_PUBLIC_AUTH_BASE_URL="https://api.seudominio.com"
BETTER_AUTH_URL="https://api.seudominio.com"
```

O app instalado chama essa API. O banco e os segredos ficam somente no backend.
