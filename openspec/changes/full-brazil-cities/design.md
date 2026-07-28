## Context

O modelo relacional de cidades já existe e está correto: `City(id, name, state, @@unique([name, state]))`, `ProfessionalCity` (N cidades por profissional, `@@unique([professionalId, cityId])`) e `ServiceRequest.cityId`. A busca de profissionais (`search-handlers.ts`) e a recomendação de oportunidades (`professional/handlers.ts`) já filtram por `cityId`. O que falta é (1) popular a base com todos os municípios do Brasil e (2) trocar a UX de seleção, que hoje baixa a lista inteira de `/cities` e filtra no cliente (`MultiSelectModal`) — inviável com ~5.570 registros.

Restrições do projeto: backend independente do mobile; nada de URL/segredo hardcoded; Postgres na Neon; deploy automático em `main` → Render; **a APK do cliente já instalada não pode quebrar** (memória `apk-cliente-nao-pode-quebrar`), e ela chama `GET /cities` esperando a lista completa.

Decisões já tomadas com o usuário: fonte = **JSON estático do IBGE versionado no repo**; busca = **endpoint no servidor com coluna normalizada + índice**; cliente = **sem cidade fixa no perfil** (continua por solicitação).

## Goals / Non-Goals

**Goals:**
- Base completa e oficial de municípios (IBGE), carregada de forma idempotente sem perder IDs existentes.
- Busca textual rápida, parcial e insensível a acento/caixa, servida pelo backend.
- Seletor de cidade com typeahead reutilizável: single-select (solicitação) e multi-select (área de atuação), sem duplicatas.
- Preservar o contrato de `GET /cities` para não quebrar a APK instalada.

**Non-Goals:**
- Não adicionar cidade fixa ao `ClientProfile` (mantido por solicitação).
- Não alterar `ProfessionalCity`/`ServiceRequest` nem as regras de filtro já existentes (apenas validá-las sobre a base maior).
- Não implementar geolocalização por GPS, bairros ou raio de distância.
- Não substituir o `MultiSelectModal` genérico (segue em uso para categorias).

## Decisions

### 1. Fonte dos dados: JSON estático do IBGE no repo
Comitar um arquivo (ex.: `packages/database/data/municipios-ibge.json`) com `{ name, state }` de todos os municípios, derivado da base oficial do IBGE. **Por quê:** determinístico, sem dependência de rede no deploy do Render, reprodutível e auditável em PR. **Alternativa descartada:** buscar na API do IBGE no seed — introduz falha de rede/indisponibilidade durante o deploy e resultados não determinísticos.

### 2. Carga por seed idempotente (upsert por `[name, state]`)
A carga roda no `seed.ts` (ou script dedicado chamado por ele) fazendo `upsert` por `name_state`. **Por quê:** o `@@unique([name, state])` já garante unicidade; upsert preserva os IDs das 7 cidades atuais (referenciadas por solicitações/coberturas) e é seguro reexecutar. **Trade-off:** ~5.570 upserts; mitigado rodando em transação/lotes e apenas quando necessário. Não usar `deleteMany` (quebraria FKs `onDelete: Restrict`).

### 3. Coluna normalizada `searchName` + índice, sem extensão do Postgres
Adicionar `City.searchName` (nome sem acento, minúsculo) preenchida na carga, com índice (`@@index([searchName])`). A busca filtra por `searchName contains normalize(q)`. **Por quê:** não depende de habilitar `unaccent`/`pg_trgm` na Neon (menos risco operacional), é simples e portátil, e a normalização é feita uma vez na carga. **Alternativa descartada:** extensão `unaccent` + `ILIKE`/`pg_trgm` — mais poderosa para ranqueamento, porém exige habilitar extensões no banco gerenciado e adiciona complexidade desnecessária para o volume atual. A normalização usa `String.normalize("NFD")` removendo diacríticos, no mesmo utilitário para carga e para o termo de busca (garante simetria).

### 4. Novo endpoint `GET /cities/search?q=&limit=`, `GET /cities` intacto
`/cities/search` valida `q` (zod), normaliza o termo, consulta `searchName contains termo`, ordena por `state, name` e limita (ex.: 20). `/cities` permanece exatamente como está. **Por quê:** preserva a APK instalada (contrato inalterado) e isola o novo comportamento. **Trade-off:** dois endpoints com propósitos próximos; aceitável e explícito — o legado tende a sair quando a base instalada migrar.

### 5. Componente mobile de typeahead consumindo `/cities/search`
Novo componente (ex.: `CitySearchPicker`) com input + lista de resultados por debounce, chamando `fetchCitySearch(q)`. Reutilizado em: criação/edição de solicitação (seleciona 1) e área de atuação do profissional (acumula seleção, remove por toque, bloqueia duplicata via checagem de `cityId` já presente). **Por quê:** evita baixar milhares de registros; entrega a busca dinâmica pedida. O `MultiSelectModal` atual continua para categorias (conjunto pequeno).

## Risks / Trade-offs

- **Carga pesada no seed (~5.570 upserts)** → rodar em lotes/transação e apenas em ambiente de carga; medir tempo no Render. Idempotência evita reexecução acidental destrutiva.
- **Divergência de normalização entre carga e busca** → centralizar em um único util `normalizeCityName()` usado nos dois lados; cobrir com teste.
- **APK instalada** → `GET /cities` permanece idêntico; nenhuma mudança de contrato. Validar manualmente que a resposta antiga não muda de forma.
- **Dataset do IBGE desatualizar** (novos/renomeados municípios são raríssimos) → arquivo versionado permite atualização por PR + reexecução idempotente do upsert.
- **Volume no seletor** → busca paginada + debounce no mobile evita listas gigantes e excesso de requisições.

## Migration Plan

1. Adicionar coluna `City.searchName` + índice via migration Prisma (nullable inicialmente para permitir backfill).
2. Adicionar o JSON de municípios ao repo e o util `normalizeCityName()`.
3. Atualizar o seed para upsert idempotente da base completa preenchendo `searchName` (e backfill das cidades já existentes).
4. Implementar `GET /cities/search` + serviço/hook no mobile e o componente de typeahead; ligar nas telas de solicitação e de área de atuação.
5. Deploy em `main` (Render aplica migration + roda a carga). Validar `/cities` (legado) e `/cities/search`.

**Rollback:** o endpoint novo e o componente podem ser revertidos sem afetar dados; a coluna `searchName` é aditiva e inofensiva se não usada. Reverter a carga não é necessário (dados oficiais são benignos); se preciso, basta reverter código — os municípios permanecem no banco sem efeito colateral.

## Open Questions

- Nenhuma bloqueante. Confirmar no apply o caminho exato do arquivo de dados e o limite de resultados por página (sugerido: 20).
