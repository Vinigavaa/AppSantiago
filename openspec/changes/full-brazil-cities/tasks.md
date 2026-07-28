## 1. Dados e normalização

- [x] 1.1 Adicionar o util `normalizeCityName(name)` (NFD + remoção de diacríticos + minúsculo) em local compartilhável pela API e pelo seed, com teste cobrindo acentos/caixa (ex.: "Criciúma" → "criciuma").
- [x] 1.2 Gerar e comitar o dataset oficial do IBGE em `packages/database/data/municipios-ibge.json` com `{ name, state }` de todos os ~5.570 municípios (UF por sigla).
- [x] 1.3 Validar o dataset: contagem esperada, sem duplicatas `(name, state)`, todas as 27 UFs presentes.

## 2. Banco de dados

- [x] 2.1 Adicionar `searchName String?` + `@@index([searchName])` ao model `City` no `schema.prisma`.
- [x] 2.2 Criar migration Prisma para a coluna e o índice (nullable para permitir backfill).
- [x] 2.3 Atualizar `seed.ts` para carregar o dataset completo via `upsert` por `name_state`, preenchendo `searchName`, em lotes/transação e de forma idempotente (sem `deleteMany`), preservando os IDs existentes.
- [x] 2.4 Backfill de `searchName` para os municípios já existentes (parte do mesmo upsert do seed).
- [ ] 2.5 Rodar o seed em produção APÓS o deploy da migration (não há banco local; não executar contra a Neon a partir da máquina de dev sem deploy). Confirmar: sem duplicatas, cidades antigas com o mesmo ID, `searchName` preenchido.

## 3. API — busca de cidades

- [x] 3.1 Implementar `listCitiesSearchHandler` em `catalog/handlers.ts`: valida `q` (zod, trim, tamanho) e `limit` (default 20), normaliza o termo com `normalizeCityName`, consulta `searchName contains termo`, ordena por `state, name`, limita e retorna `{ cities: [{ id, name, state }] }`. Termo vazio → lista vazia (ou inicial curta), sem erro.
- [x] 3.2 Registrar a rota `GET /cities/search` em `app-routes.ts` (mantendo `GET /cities` intacto).
- [x] 3.3 Confirmar que `GET /cities` permanece com o contrato atual (compatibilidade da APK instalada) — sem alterações.
- [x] 3.4 `npm run api:typecheck` sem erros.

## 4. Mobile — seletor de cidade com typeahead

- [x] 4.1 Adicionar `fetchCitySearch(q)` no service do mobile (`service-requests/service.ts`) consumindo `/cities/search`.
- [x] 4.2 Criar o componente `CitySearchPicker` (input + resultados dinâmicos com debounce, estado vazio, exibindo "Nome - UF") reutilizável para single e multi-select.
- [x] 4.3 Usar o `CitySearchPicker` (single-select) na criação de solicitação (`RequestForm`/`useCreateRequestForm`) e na edição (`EditRequestScreen`), substituindo o carregamento total via `/cities`. Validar cidade obrigatória.
- [x] 4.4 Usar o `CitySearchPicker` (multi-select) na área de atuação do profissional, permitindo adicionar/remover e bloqueando duplicata (checar `cityId` já selecionado). (Componente dedicado `CityMultiSelectModal` com busca no servidor.)
- [x] 4.5 Usar o mecanismo de busca no filtro de cidade da busca de profissionais (`ProfessionalSearchScreen`), em vez da lista completa.
- [x] 4.6 Remover o carregamento completo de `/cities` onde foi substituído; manter `MultiSelectModal` genérico para categorias. (Removido `fetchCities` e o load de cidades no `useCatalog`; `/cities` mantido no servidor.)

## 5. Regras de localização (validação)

- [x] 5.1 Confirmar que as oportunidades ao profissional (`professional/handlers.ts`) consideram apenas as cidades da área de atuação sobre a base completa. (Filtro `cityId: { in: coverage.cityIds }`.)
- [x] 5.2 Confirmar que a busca de profissionais (`search-handlers.ts`) retorna apenas quem atende a `cityId` selecionada. (Filtro `cities: { some: { cityId } }`.)
- [x] 5.3 Confirmar que solicitações só são criadas/editadas com `cityId` válido do cadastro oficial. (Handlers fazem `city.findUnique` → `INVALID_CITY`; setter do profissional valida e deduplica ids.)

## 6. Verificação final

- [x] 6.1 `npm run api:typecheck` e `npx tsc --noEmit -p tsconfig.json` (mobile) sem erros. (+ `npm run cities:smoke` verde.)
- [ ] 6.2 Teste manual (pós-seed): buscar "criciuma", "SAO PAULO", "flor" retorna resultados corretos ignorando acento/caixa.
- [ ] 6.3 Teste manual (pós-seed): fluxo completo — cliente cria solicitação em cidade nova; profissional adiciona a mesma cidade; oportunidade aparece; busca por cidade retorna o profissional.
- [ ] 6.4 Confirmar que a APK instalada (contrato `/cities`) continua funcionando após o deploy.
