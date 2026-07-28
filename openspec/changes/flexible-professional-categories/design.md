## Context

Atualmente o `Category` já é o eixo de toda a lógica: busca de profissionais (`search-handlers.ts`), oportunidades (`professional/handlers.ts`) e criação de solicitações (`service-requests`) filtram por `categoryId`. Não existe campo de profissão livre — o rótulo "profissão" exibido nos cartões/chat/perfil é o `mainCategory`, derivado da primeira categoria (`profile-data.ts:85`). O catálogo tem só 10 categorias tipo-profissão (`seed.ts`), referenciadas por profissionais e solicitações reais (FKs `onDelete: Restrict`).

Restrições: backend independente do mobile; nada hardcoded/segredo; Postgres na Neon; deploy automático em `main` → Render; **a APK do cliente instalada não pode quebrar** (memória `apk-cliente-nao-pode-quebrar`) — ela consome `/categories` (lista de ativas). Há usuários reais testando (memória `cliente-testando-apk-e8cbbba`), então a migração de dados precisa ser segura e reversível em código.

Decisões tomadas com o usuário: migrar antigas→novas e desativar; profissão com fallback para categoria; busca de categorias client-side; sugestão apenas registrada para análise manual.

## Goals / Non-Goals

**Goals:**
- Separar apresentação (profissão livre) de classificação (categorias).
- Catálogo amplo (~65) cobrindo a maioria dos serviços freelancer do Brasil.
- Migrar o catálogo antigo sem perder atuação de profissionais nem categoria de solicitações.
- Seleção de categorias com busca dinâmica e ação "Sugerir nova categoria".
- Manter `/categories` compatível com a APK instalada.

**Non-Goals:**
- Painel administrativo de aprovação de sugestões (aprovação manual via banco nesta entrega).
- Endpoint de busca de categorias no servidor (catálogo pequeno; filtro client-side basta).
- Alterar a modelagem de `Category`/`ProfessionalCategory`/`ServiceRequest`.
- Usar a profissão como filtro estruturado ou critério de recomendação.

## Decisions

### 1. `profession` como coluna livre em `ProfessionalProfile`
Adicionar `profession String?` (nullable). **Por quê:** é dado de apresentação do profissional, 1:1 com o perfil; não precisa de tabela nem relação. Editável no cadastro/edição. **Alternativa descartada:** reaproveitar `displayUsername` — é um username com outra semântica, misturaria conceitos.

### 2. Exibição com fallback `profession ?? mainCategory`
Nos serializers (perfil público, busca, chat, propostas) e no app, o rótulo de apresentação passa a ser `profession` e, quando vazio, a primeira categoria. **Por quê:** transição suave — perfis antigos (sem profissão) continuam com um rótulo. Centralizar a regra num único helper no backend evita divergência entre telas.

### 3. Catálogo amplo por seed idempotente (upsert por `slug`)
As ~65 categorias são semeadas via `upsert` por `slug` (estável). **Por quê:** `slug` já é único no schema; idempotente e seguro reexecutar. O `seed.ts` deixa de conter só 10 e passa a conter o catálogo amplo. Inclui uma categoria "Mecânica Automotiva" para acomodar o antigo "Mecânico".

### 4. Migração antigas→novas por script dedicado, dentro de transação
Um script (`scripts/migrate-categories.ts`, no padrão dos demais `scripts/*.ts`) executa, em transação: para cada categoria antiga, garante a nova equivalente (pelo seed), **reponta** `ProfessionalCategory` e `ServiceRequest` para a nova (com `ON CONFLICT DO NOTHING`/checagem para não violar `@@unique([professionalId, categoryId])`), remove as entradas antigas duplicadas e por fim marca a antiga como `isActive: false`. **Por quê:** manter o seed puramente aditivo (idempotente) e isolar a reclassificação — que toca dados de produção — num passo explícito, auditável e reexecutável. Mapa fixo antigas→novas versionado no script. **Alternativa descartada:** fazer tudo dentro do seed — misturaria carga com migração de dados e dificultaria reexecução segura.

Mapa: Pedreiro→Construção Civil; Eletricista→Elétrica; Encanador→Hidráulica; Pintor→Pintura; Marceneiro→Marcenaria; Jardineiro→Jardinagem; Diarista→Limpeza Residencial; Técnico em ar-condicionado→Ar-condicionado; Mecânico→Mecânica Automotiva; Montador de móveis→Montagem de Móveis.

### 5. Seleção de categorias com filtro client-side (reuso)
O app baixa `/categories` (ativas) e filtra localmente por nome ignorando acento/caixa, com múltipla seleção. **Por quê:** ~65–100 itens cabem tranquilamente no cliente; instantâneo e sem endpoint novo. Reaproveita o `MultiSelectModal` (já `searchable`) — mas o filtro atual não ignora acento; melhorar para usar a mesma normalização das cidades. Adicionar a ação "Sugerir nova categoria" no rodapé do modal.

### 6. `CategorySuggestion` como fila de análise
Novo model `CategorySuggestion { id, professionalId, name, status PENDING|APPROVED|REJECTED, createdAt }` + endpoint `POST /professional/category-suggestions`. **Por quê:** captura a demanda sem expor ao catálogo; aprovação manual via banco/Prisma Studio nesta fase. `status` já preparado para um fluxo admin futuro.

### 7. Profissão no texto livre de busca, nunca como filtro
Incluir `profession` no `OR` do parâmetro `q` de `search-handlers.ts` (junto de nome/bio/categoria). Os filtros estruturados (`categoryId`) e a recomendação de oportunidades permanecem só em categorias. **Por quê:** honra "profissão é descritiva" e ainda torna o profissional encontrável por seu título ao digitar livremente.

## Risks / Trade-offs

- **Migração de dados em produção** → script transacional, idempotente e com o mapa versionado; rodar após o deploy, com contagem antes/depois. Nada é deletado do catálogo (só desativado), então é reversível reativando as antigas.
- **Violar `@@unique([professionalId, categoryId])` ao repontar** → antes de mover, verificar se o profissional já tem a nova categoria; se sim, apenas remover a antiga (sem inserir duplicata).
- **APK instalada** → `/categories` mantém o contrato (só cresce a lista); nada de breaking no endpoint.
- **Catálogo maior no MultiSelectModal antigo (APK)** → ~65 itens filtrados client-side seguem performáticos.
- **Fallback inconsistente entre telas** → centralizar `presentationLabel(profession, categories)` no backend e refletir igual no app.

## Migration Plan

1. Migration Prisma: `ProfessionalProfile.profession` + model `CategorySuggestion`.
2. Atualizar `seed.ts` para o catálogo amplo (upsert por slug) e rodar o seed (adiciona as novas categorias).
3. Rodar `scripts/migrate-categories.ts` (reponta referências antigas→novas, remove duplicatas, desativa antigas) — após o seed, em produção, com verificação de contagem.
4. API: `profession` na leitura/edição/serializers, endpoint de sugestão, `profession` no `q` da busca.
5. Mobile: campo de profissão, exibição com fallback, seleção de categorias com busca (normalizada) + "Sugerir nova categoria".
6. Deploy em `main` (migration aplica; seed e migração de categorias são passos deliberados). Validar `/categories`, busca, oportunidades, criação de solicitação.

**Rollback:** `profession` e `CategorySuggestion` são aditivos e inertes se não usados. A desativação das categorias antigas é reversível (`isActive: true`). O repontamento de referências é o passo mais sensível — a transação garante tudo-ou-nada; se preciso, um script inverso reponta usando o mapa reverso.

## Open Questions

- Nenhuma bloqueante. Confirmar no apply a lista final das ~65 categorias (uso a do pedido + "Mecânica Automotiva") e os textos exatos dos slugs.
