# AGENTS.md

## Stack do Projeto

Este projeto utiliza:

- Expo
- React Native
- Expo Router
- TypeScript
- Monorepo com npm + Turborepo
- Expo API Routes
- Prisma
- Neon PostgreSQL
- TanStack Query
- Zustand
- Zod
- React Hook Form
- expo-location
- react-native-maps
- EAS Build

---

# Regra Principal

Manter o projeto:

- Limpo
- Seguro
- Escalável
- Organizado
- Fácil de manter
- Sem código duplicado
- Com responsabilidades bem separadas

Evitar soluções improvisadas, código confuso ou abstrações desnecessárias.

---

# Estrutura do Monorepo

```txt
apps/
  mobile/

packages/
  database/
  schemas/
  utils/
  config/
```

## apps/mobile

Contém o app Expo.

Responsável por:

- Telas
- Navegação
- Interface
- Permissões nativas
- Consumo das API Routes
- Estado local/global
- Localização
- Mapa

## packages/database

Contém:

- Prisma
- schema.prisma
- migrations
- Prisma Client

## packages/schemas

Contém schemas compartilhados com Zod.

Exemplos:

```txt
login-schema.ts
register-schema.ts
user-schema.ts
```

## packages/utils

Contém funções puras e reutilizáveis.

Exemplos:

```txt
formatCurrency.ts
formatDate.ts
calculateDistance.ts
```

## packages/config

Contém configurações compartilhadas.

Exemplos:

```txt
eslint
typescript
prettier
```

---

# Estrutura do App Mobile

```txt
apps/mobile/src/

  app/
    _layout.tsx

    api/
      auth/
      users/
      locations/

    (auth)/
      login.tsx
      register.tsx

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

  components/
    ui/

  services/

  stores/

  hooks/

  lib/

  constants/

  types/
```

---

# Responsabilidade da Pasta app/

A pasta `app/` deve conter apenas:

- Rotas
- Layouts
- Grupos de rotas
- API Routes

Não colocar dentro de `app/`:

- Regra de negócio
- Componentes grandes
- Services
- Validações
- Hooks complexos
- Lógica de banco

---

# API Routes

As API Routes ficam em:

```txt
apps/mobile/src/app/api/
```

Elas são responsáveis por:

- Receber requisições do app
- Validar dados
- Verificar autenticação
- Chamar Prisma
- Retornar resposta segura

Exemplo:

```txt
app/api/auth/login+api.ts
app/api/auth/register+api.ts
app/api/users/me+api.ts
```

O app mobile nunca deve acessar o banco diretamente.

Fluxo correto:

```txt
Tela
  -> service/api-client
  -> Expo API Route
  -> Prisma
  -> Neon PostgreSQL
```

Nunca fazer:

```txt
Tela
  -> Prisma
  -> Banco
```

---

# Banco de Dados

Banco utilizado:

```txt
Neon PostgreSQL
```

ORM utilizado:

```txt
Prisma
```

O Prisma deve ficar apenas em:

```txt
packages/database
```

Estrutura:

```txt
packages/database/
  prisma/
    schema.prisma
    migrations/

  src/
    client.ts
```

Nunca expor:

- DATABASE_URL
- Senha do banco
- Tokens secretos
- Chaves privadas

---

# Prisma Client

Criar o client centralizado:

```ts
import { PrismaClient } from "@prisma/client"

export const prisma = new PrismaClient()
```

Nunca criar várias instâncias do Prisma espalhadas pelo projeto.

---

# Migrations

Toda alteração no banco deve ser feita com migration.

Usar:

```bash
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

Nunca alterar estrutura do banco manualmente em produção.

---

# Autenticação

A autenticação deve ser feita via API Routes.

Fluxo:

```txt
Usuário faz login
  -> API valida credenciais
  -> API gera token/sessão
  -> App salva token com segurança
  -> App usa token nas próximas requisições
```

Nunca salvar token em AsyncStorage puro.

Usar:

```txt
expo-secure-store
```

Criar wrapper:

```txt
src/services/secure-storage.ts
```

Com funções:

```ts
saveToken()
getToken()
removeToken()
```

---

# Rotas Públicas e Privadas

Usar grupos de rotas:

```txt
app/(auth)/
app/(private)/
```

## (auth)

Contém:

```txt
login
register
forgot-password
```

## (private)

Contém telas acessíveis apenas com usuário logado.

O arquivo:

```txt
app/(private)/_layout.tsx
```

deve proteger as rotas privadas.

---

# Features

Usar arquitetura baseada em features.

Exemplo:

```txt
features/
  auth/
    components/
    hooks/
    services/
    schemas/
    types.ts

  map/
    components/
    hooks/
    services/
    types.ts

  location/
    hooks/
    services/
    types.ts
```

Cada feature deve concentrar o que pertence ao seu domínio.

Evitar criar uma pasta global enorme como:

```txt
screens/
components/
services/
hooks/
```

com tudo misturado.

---

# Components UI

A pasta:

```txt
components/ui
```

deve conter apenas componentes reutilizáveis.

Exemplos:

```txt
Button.tsx
Input.tsx
Card.tsx
Modal.tsx
Avatar.tsx
```

Esses componentes não devem conter regra de negócio.

---

# Services

A pasta `services/` deve conter integrações globais.

Exemplos:

```txt
api-client.ts
secure-storage.ts
notifications.ts
permissions.ts
```

Nunca fazer chamadas HTTP diretamente dentro das telas.

Evitar:

```ts
fetch("https://...")
```

Preferir:

```ts
api.get("/users/me")
api.post("/auth/login")
```

---

# TanStack Query

Dados vindos da API devem usar TanStack Query.

Usar:

```ts
useQuery()
useMutation()
```

Não duplicar dados remotos dentro do Zustand.

Zustand deve guardar apenas estados globais do app.

---

# Zustand

Usar Zustand para:

- Sessão
- Usuário autenticado
- Preferências globais
- Tema
- Estado global necessário

Não usar Zustand para:

- Inputs
- Formulários
- Modais locais
- Estados temporários de tela

---

# Formulários

Usar:

```txt
React Hook Form + Zod
```

Todo formulário deve ter validação com Zod.

Evitar formulários grandes controlados apenas com `useState`.

---

# Validação

Toda entrada externa deve ser validada.

Validar dados vindos de:

- Formulários
- API
- Banco
- Localização
- Deep links
- Push notifications
- Async storage
- Secure storage

Nunca confiar cegamente em dados externos.

---

# Localização

Usar:

```txt
expo-location
```

A lógica de localização deve ficar em:

```txt
features/location/
```

Estrutura sugerida:

```txt
features/location/
  hooks/
    useCurrentLocation.ts

  services/
    location-service.ts

  types.ts
```

Fluxo obrigatório:

```txt
1. Verificar permissão
2. Solicitar permissão
3. Tratar permissão negada
4. Buscar localização
5. Tratar erro
```

O app deve continuar funcionando mesmo se o usuário negar localização.

---

# Mapa

Usar:

```txt
react-native-maps
```

A lógica de mapa deve ficar em:

```txt
features/map/
```

Estrutura sugerida:

```txt
features/map/
  components/
    AppMap.tsx
    MapMarker.tsx

  hooks/
    useMapRegion.ts

  services/
    map-service.ts

  types.ts
```

A tela não deve conter lógica complexa de mapa.

Evitar colocar na tela:

- Cálculo de região
- Filtros de markers
- Conversão de coordenadas
- Lógica de permissão
- Regras de negócio

---

# Coordenadas

Sempre usar objeto tipado:

```ts
type Coordinates = {
  latitude: number
  longitude: number
}
```

Nunca usar array solto:

```ts
[-28.6775, -49.3697]
```

---

# Padrão de Código

Preferir componentes assim:

```tsx
export function UserCard() {}
```

Evitar:

```tsx
const UserCard = () => {}
```

Props sempre tipadas:

```ts
type Props = {
  name: string
  email: string
}
```

Nunca usar `any` sem justificativa real.

---

# Imports

Ordem dos imports:

```txt
1. React / React Native
2. Bibliotecas externas
3. Pacotes do monorepo
4. Aliases internos
5. Imports relativos
```

Exemplo:

```ts
import { View } from "react-native"

import { useQuery } from "@tanstack/react-query"

import { loginSchema } from "@repo/schemas"

import { api } from "@/services/api-client"

import { LoginForm } from "./LoginForm"
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
location-service.ts
map-service.ts
```

Stores:

```txt
auth-store.ts
user-store.ts
```

Schemas:

```txt
login-schema.ts
register-schema.ts
```

---

# Segurança

Nunca commitar:

- `.env`
- Tokens
- Senhas
- DATABASE_URL
- Chaves de API
- Certificados
- Secrets

Usar variáveis de ambiente.

Separar:

```txt
.env.example
.env.local
```

O `.env.example` pode existir, mas sem valores reais.

---

# Tratamento de Erros

Toda operação assíncrona deve tratar erro.

Usar:

```ts
try/catch
```

ou:

```ts
onError
```

Nunca ignorar erros silenciosamente.

Mensagens para usuário devem ser claras, sem expor detalhes internos.

Evitar mostrar:

```txt
DATABASE_URL inválida
JWT_SECRET ausente
Prisma error...
```

---

# Logs

Durante desenvolvimento, `console.log` é permitido.

Antes de finalizar tarefa:

- Remover logs desnecessários
- Remover código morto
- Remover comentários inúteis

Em produção, usar ferramenta apropriada de monitoramento/log.

---

# Performance

Não otimizar antes da necessidade.

Usar:

```ts
memo
useMemo
useCallback
```

somente quando houver motivo real.

Para listas grandes, usar:

```txt
FlatList
FlashList
```

Evitar renderizar listas grandes com `map`.

---

# Testes

Prioridade de testes:

```txt
1. Regras de negócio
2. Schemas
3. Services
4. Hooks
5. Componentes críticos
```

Testar comportamento, não implementação interna.

---

# Antes de Criar Código Novo

Verificar:

```txt
1. Já existe algo parecido?
2. Dá para reutilizar componente?
3. Dá para reutilizar hook?
4. Dá para reutilizar service?
5. Isso pertence a uma feature existente?
6. Isso deve ir para package compartilhado?
```

Evitar duplicação.

---

# Antes de Finalizar Qualquer Tarefa

Verificar:

```txt
- Código compila
- TypeScript sem erro
- ESLint sem erro
- Sem any desnecessário
- Sem console.log perdido
- Sem código morto
- Sem duplicação
- Arquivos nas pastas corretas
- Responsabilidades separadas
- Dados externos validados
- Erros tratados
- Nenhum segredo exposto
```

---

# Regra Final

O código deve ser simples o suficiente para outro desenvolvedor entender rapidamente.

Priorizar:

```txt
Clareza > esperteza
Simplicidade > abstração precoce
Organização > velocidade improvisada
Segurança > facilidade
Manutenção > gambiarra
```