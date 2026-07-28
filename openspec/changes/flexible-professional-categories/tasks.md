## 1. Banco de dados

- [x] 1.1 Adicionar `profession String?` ao model `ProfessionalProfile` no `schema.prisma`.
- [x] 1.2 Adicionar o model `CategorySuggestion { id, professionalId (FK, onDelete: Cascade), name, status (enum PENDING|APPROVED|REJECTED, default PENDING), createdAt }` + índices (`professionalId`, `status`).
- [x] 1.3 Criar migration Prisma para a coluna `profession`, o enum e a tabela `CategorySuggestion`.
- [x] 1.4 `npm run db:generate` e `npm run db:validate` sem erros.

## 2. Catálogo de categorias (seed)

- [x] 2.1 Definir o catálogo amplo (~65) com `name`/`slug`, cobrindo a lista do pedido + "Mecânica Automotiva". Slugs kebab-case sem acento.
- [x] 2.2 Atualizar `seed.ts` para upsert idempotente do catálogo amplo por `slug` (sem remover categorias existentes; sem reativar, para não reverter a migração).
- [ ] 2.3 Rodar o seed no deploy (não executar contra a Neon de produção a partir da dev). Confirmar categorias ativas.

## 3. Migração das categorias antigas

- [x] 3.1 Criar `scripts/migrate-categories.ts` com o mapa fixo antigas→novas (Pedreiro→Construção Civil, Eletricista→Elétrica, Encanador→Hidráulica, Pintor→Pintura, Marceneiro→Marcenaria, Jardineiro→Jardinagem, Diarista→Limpeza Residencial, Técnico em ar-condicionado→Ar-condicionado, Mecânico→Mecânica Automotiva, Montador de móveis→Montagem de Móveis).
- [x] 3.2 No script, em transação: repontar `ServiceRequest.categoryId` antigo→novo; repontar `ProfessionalCategory` antigo→novo sem violar `@@unique([professionalId, categoryId])` (se já tem a nova, apenas remover a antiga); ao final marcar as antigas `isActive: false`.
- [x] 3.3 Adicionar script ao `package.json` (`categories:migrate`) e imprimir contagens para auditoria. Execução contra produção fica para o deploy.

## 4. API — profissão e serializers

- [x] 4.1 Incluir `profession` na leitura do perfil (`professional/profile-data.ts`). Fallback (profissão ?? categoria) centralizado num helper no app (serializers só expõem o campo `profession`; `mainCategory` já existe).
- [x] 4.2 Aceitar `profession` na edição do perfil: `professional/schemas.ts` (opcional, `trim`, máx. 80) e `profile-handlers.ts` (`updateProfessionalProfileHandler`).
- [x] 4.3 Expor `profession` nos serializers de perfil público (`public-profile-handlers.ts`), busca (`search-handlers.ts`) e chat (`chat/serialize.ts`). Propostas não têm slot de profissão (só nome+nota) — não adicionado para não criar campo morto.
- [x] 4.4 Incluir `profession` no `OR` do parâmetro `q` da busca (`search-handlers.ts`), mantendo `categoryId` como único filtro estruturado.

## 5. API — sugestão de categoria

- [x] 5.1 Criar `createCategorySuggestionHandler` (valida nome; grava `CategorySuggestion` PENDING vinculada ao profissional autenticado) e registrar `POST /professional/category-suggestions` em `app-routes.ts`.
- [x] 5.2 Garantir que sugestões pendentes não aparecem em `/categories` (que já retorna apenas `isActive: true`). Sugestão vive em tabela separada, nunca em `Category`.
- [x] 5.3 `npm run api:typecheck` sem erros.

## 6. Mobile — profissão e exibição

- [x] 6.1 Adicionar `profession` aos tipos (`professional/types.ts`: `ProfessionalProfileInfo`, `PublicProfessional`, `ProfessionalSummary`), ao `UpdateProfileInput` e ao `ChatOtherUser`. Helper único `presentationLabel` em `professional/presentation.ts`.
- [x] 6.2 Campo "Profissão" (texto livre) no formulário de dados pessoais do profissional (`PersonalInfoModal`) — cadastro/edição.
- [x] 6.3 Exibir o rótulo de apresentação com fallback (profissão ?? mainCategory) nos cartões (`ProfessionalCard`), perfil público (`PublicProfessionalScreen`), perfil próprio (`ProfessionalProfileScreen`) e chat (`ChatHeader`, subtítulo de profissão).

## 7. Mobile — seleção de categorias

- [x] 7.1 Melhorar o filtro de busca do `MultiSelectModal` para ignorar acento/caixa (util `src/lib/normalize-text.ts`, espelha o backend das cidades).
- [x] 7.2 Usar o seletor (searchable) na área "Categorias atendidas" do profissional, com múltipla seleção, remover fácil e sem duplicar.
- [x] 7.3 Adicionar a ação "Sugerir nova categoria" no seletor (prop opcional `onSuggest`): quando a busca não acha, oferece sugerir o termo digitado; envia via `POST /professional/category-suggestions` e confirma que ficou em análise.
- [x] 7.4 Adicionar `createCategorySuggestion(name)` no service do profissional (`professional/service.ts`).

## 8. Revisão de dependências e verificação

- [x] 8.1 Revisar busca, oportunidades, filtros, recomendação, criação de solicitação, dashboard e estatísticas: confirmam que usam apenas `categoryId` (categorias), nunca a profissão como filtro/recomendação. Profissão só entra no texto livre `q`.
- [x] 8.2 `npm run api:typecheck` e `npx tsc --noEmit -p tsconfig.json` (mobile) sem erros. Seed e script de migração também compilam.
- [ ] 8.3 Teste manual (pós-seed+migração): buscar por profissão no texto livre encontra o profissional; filtro por categoria funciona; oportunidades respeitam categorias; criar solicitação usa categoria ativa.
- [ ] 8.4 Teste manual: enviar "Sugerir nova categoria" grava PENDING e não aparece para outros; a APK instalada (contrato `/categories`) continua funcionando.
