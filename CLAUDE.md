# CLAUDE.md

## Visão Geral

Este projeto é dividido em dois apps separados dentro do mesmo repositório:

```txt
apps/
  mobile/
  api/
```

- `apps/mobile`: aplicativo Expo + React Native.
- `apps/api`: backend responsável por autenticação, banco de dados e regras sensíveis.

O projeto usa **npm workspaces**, sem Turborepo.

---

# Stack

## Mobile

- Expo
- React Native
- Expo Router
- TypeScript
- TanStack Query
- Zustand
- React Hook Form
- Zod
- expo-secure-store
- expo-location
- react-native-maps
- EAS Build

## API

- Node.js
- TypeScript
- Better Auth
- Prisma
- Neon PostgreSQL
- Zod
- Resend para emails
- Rate limit nos endpoints sensíveis

---

# Regra Principal

O app mobile é apenas cliente.

Ele nunca deve acessar diretamente:

- Prisma
- Neon PostgreSQL
- DATABASE_URL
- Secrets
- Tokens privados
- Chaves de API sensíveis

Fluxo correto:

```txt
Mobile
  -> API HTTPS
  -> Better Auth / Services
  -> Prisma
  -> Neon PostgreSQL
```

---

# Estrutura do Projeto

```txt
project-root/

  apps/
    mobile/
      src/

    api/
      src/
      prisma/

  packages/
    schemas/
    utils/

  package.json
  package-lock.json
```

---

# Gerenciador de Pacotes

Usar apenas:

```bash
npm
```

Não usar:

```txt
pnpm
yarn
turbo
```

Scripts devem ser organizados no `package.json` raiz e nos `package.json` internos de cada app.

---

# apps/mobile

Responsável por:

- Telas
- Navegação
- Interface
- Permissões nativas
- Mapa
- Localização
- Estado local/global
- Consumo da API

Não deve conter:

- Prisma
- Better Auth server
- Lógica de banco
- Secrets
- Regras críticas de autorização

---

# apps/api

Responsável por:

- Autenticação com Better Auth
- Cadastro
- Login
- Sessões
- Recuperação de senha
- Verificação de email
- Rate limit
- Prisma
- Neon PostgreSQL
- Regras de negócio
- Autorização
- Validações sensíveis
- Envio de emails com Resend

---

# Estrutura do Mobile

```txt
apps/mobile/src/

  app/
    _layout.tsx

    (auth)/
      sign-in.tsx
      sign-up.tsx
      forgot-password.tsx

    (private)/
      _layout.tsx
      home.tsx
      map.tsx
      profile.tsx

  features/
    auth/
    user/
    location/
    map/
    service-request/
    proposal/
    chat/
    review/

  components/
    ui/

  services/
    api-client.ts
    secure-storage.ts

  stores/

  hooks/

  lib/

  constants/

  types/
```

---

# Estrutura da API

```txt
apps/api/

  prisma/
    schema.prisma
    migrations/
    seed.ts

  src/
    auth/
      auth.ts

    modules/
      users/
      service-requests/
      proposals/
      chats/
      reviews/
      notifications/
      categories/
      cities/

    lib/
      prisma.ts
      env.ts
      resend.ts

    middlewares/
      auth-middleware.ts
      rate-limit.ts

    routes/

    server.ts
```

---

# Autenticação

A autenticação deve ser feita com:

```txt
Better Auth
```

O Better Auth deve rodar somente em:

```txt
apps/api
```

O mobile deve apenas consumir os endpoints da API.

---

# Regras de Cadastro

O cadastro público permite apenas:

```txt
CLIENT
PROFESSIONAL
```

Nunca permitir cadastro público como:

```txt
ADMIN
```

Mesmo que o frontend envie `ADMIN`, a API deve ignorar ou bloquear.

Usuário ADMIN só pode ser criado por:

- Seed
- Script interno
- Área administrativa protegida futuramente

---

# Sessão no Mobile

O mobile deve armazenar sessão/token com:

```txt
expo-secure-store
```

Nunca usar AsyncStorage para token ou sessão.

Criar wrapper:

```txt
apps/mobile/src/services/secure-storage.ts
```

---

# API Client

Toda chamada HTTP do mobile deve passar por:

```txt
apps/mobile/src/services/api-client.ts
```

Nunca espalhar `fetch` ou URL da API diretamente nas telas.

A URL da API deve vir de variável de ambiente.

Exemplo:

```txt
EXPO_PUBLIC_API_URL=https://api.seudominio.com
```

---

# Prisma

O Prisma deve existir apenas em:

```txt
apps/api/prisma
```

Nunca instalar ou importar Prisma no app mobile.

O client deve ser centralizado em:

```txt
apps/api/src/lib/prisma.ts
```

---

# Banco de Dados

Banco utilizado:

```txt
Neon PostgreSQL
```

Toda alteração estrutural deve ser feita via migration.

Nunca alterar banco manualmente sem migration.

---

# Emails

Usar Resend para:

- Verificação de email
- Recuperação de senha
- Notificações futuras

Chaves da Resend devem existir apenas na API.

---

# Segurança

Nunca commitar:

- `.env`
- DATABASE_URL
- BETTER_AUTH_SECRET
- RESEND_API_KEY
- Chaves privadas
- Tokens
- Senhas

Manter apenas:

```txt
.env.example
```

sem valores reais.

---

# Rate Limit

Aplicar rate limit principalmente em:

- Login
- Cadastro
- Recuperação de senha
- Verificação de email

Objetivo:

- Evitar brute force
- Evitar spam
- Evitar criação massiva de contas

---

# Validação

Usar Zod para validar:

- Formulários no mobile
- Payloads recebidos na API
- Parâmetros de rota
- Dados externos

Nunca confiar em dados vindos do frontend.

---

# Organização por Features

Tanto no mobile quanto na API, organizar por domínio.

Exemplos:

```txt
auth
users
service-requests
proposals
chat
reviews
notifications
categories
cities
map
location
```

Evitar pastas gigantes com tudo misturado.

---

# Mobile: Responsabilidade das Telas

Telas devem apenas:

- Renderizar interface
- Chamar hooks
- Exibir loading
- Exibir erros
- Navegar

Telas não devem conter:

- Regra de negócio
- Lógica complexa
- Chamada direta à API
- Validação manual grande

---

# TanStack Query

Usar para dados vindos da API:

```txt
useQuery
useMutation
```

Não duplicar dados remotos no Zustand.

---

# Zustand

Usar Zustand apenas para:

- Sessão
- Usuário autenticado
- Preferências globais
- Estado global realmente necessário

Não usar Zustand para:

- Inputs
- Formulários
- Modais locais
- Estado temporário de tela

---

# Formulários

Usar:

```txt
React Hook Form + Zod
```

Evitar formulários grandes controlados apenas com `useState`.

---

# Localização

Usar:

```txt
expo-location
```

A lógica de localização deve ficar em:

```txt
features/location
```

O app deve continuar funcionando mesmo se o usuário negar permissão.

---

# Mapa

Usar:

```txt
react-native-maps
```

A lógica de mapa deve ficar em:

```txt
features/map
```

Evitar lógica complexa de mapa diretamente nas telas.

---

# Coordenadas

Sempre usar:

```ts
type Coordinates = {
  latitude: number
  longitude: number
}
```

Nunca usar array solto como:

```ts
[-28.6775, -49.3697]
```

---

# Padrão de Código

Preferir:

```tsx
export function UserCard() {}
```

Evitar:

```tsx
const UserCard = () => {}
```

Props sempre tipadas.

Nunca usar `any` sem justificativa real.

---

# Imports

Ordem recomendada:

```txt
1. React / React Native
2. Bibliotecas externas
3. Pacotes compartilhados
4. Aliases internos
5. Imports relativos
```

---

# Nomenclatura

Componentes:

```txt
UserCard.tsx
LoginForm.tsx
MapMarker.tsx
```

Hooks:

```txt
useAuth.ts
useCurrentLocation.ts
useMapRegion.ts
```

Services:

```txt
auth-service.ts
api-client.ts
location-service.ts
```

Stores:

```txt
auth-store.ts
user-store.ts
```

Schemas:

```txt
sign-in-schema.ts
sign-up-schema.ts
service-request-schema.ts
```

---

# Tratamento de Erros

Toda operação assíncrona deve tratar erro.

Mensagens para usuário devem ser claras.

Nunca expor detalhes internos como:

```txt
DATABASE_URL inválida
Prisma error
BETTER_AUTH_SECRET ausente
Stack trace
```

---

# Antes de Finalizar uma Tarefa

Verificar:

```txt
- Código compila
- TypeScript sem erro
- Sem any desnecessário
- Sem console.log perdido
- Sem código morto
- Sem secrets expostos
- Mobile não acessa banco direto
- API centraliza autenticação e Prisma
- Dados externos são validados
- Erros são tratados
```

---

# Regra Final

Priorizar:

```txt
Clareza > esperteza
Simplicidade > abstração precoce
Segurança > facilidade
Organização > velocidade improvisada
Manutenção > gambiarra
```