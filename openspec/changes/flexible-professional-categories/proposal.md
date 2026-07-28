## Why

Hoje a "profissão" do profissional é, na prática, a primeira categoria de um catálogo minúsculo de 10 itens (Pedreiro, Eletricista, Encanador...). Isso limita quem pode usar o app: profissionais fora dessas 10 áreas não se encaixam, e não há como um profissional se apresentar com um título próprio ("Especialista em Energia Solar"). Para atender praticamente qualquer serviço freelancer do Brasil, é preciso separar **como o profissional se apresenta** (texto livre) de **como a plataforma o classifica** (categorias amplas), e ampliar muito o catálogo de categorias.

## What Changes

- **Novo campo "profissão" (texto livre)** no perfil do profissional: descritivo, definido pelo próprio profissional (ex.: "Marceneiro Artesanal", "Designer Freelancer"). Exibido no perfil público, nos cartões de busca e no chat. **Não** é critério estruturado de busca/recomendação (a lógica permanece nas categorias); pode aparecer como correspondência no texto livre de busca.
- **Exibição com fallback**: onde hoje aparece o `mainCategory` (cartões, chat, perfil), passa a aparecer a profissão; quando vazia, cai de volta para a primeira categoria — nada fica sem rótulo.
- **Catálogo amplo de categorias (~65)** cobrindo as principais áreas de serviço do Brasil (Construção Civil, Elétrica, Limpeza, TI, Design, Marketing, Saúde, Beleza, Pets, etc.), carregado por seed idempotente.
- **Migração do catálogo antigo**: as 10 categorias tipo-profissão são mapeadas para as novas equivalentes; as referências de profissionais e solicitações são movidas para as novas; as antigas são **desativadas** (não somem do banco — referências históricas seguem íntegras). **BREAKING** (dados): reclassificação de categorias existentes.
- **Seleção de categorias com busca dinâmica** no cadastro/edição do profissional: pesquisa por nome conforme digita (filtro client-side, ignorando acento/caixa), múltipla seleção, remover fácil. Reaproveita o padrão de multi-seleção existente.
- **"Sugerir nova categoria"**: o profissional envia uma sugestão que fica registrada para análise administrativa manual (status PENDING). Não aparece para outros usuários nem vira categoria ativa automaticamente.
- **Revisão de dependências**: garantir que toda busca, filtro, oportunidade, recomendação, criação de solicitação, dashboard e estatística use exclusivamente as categorias de atuação — nunca a profissão livre.

Fora de escopo (decidido com o usuário): painel administrativo de aprovação de sugestões (a aprovação é manual via banco nesta entrega); busca de categorias no servidor (catálogo é pequeno; filtro client-side basta).

## Capabilities

### New Capabilities
- `professional-profession`: campo de profissão em texto livre no perfil do profissional (apresentação), com regra de exibição e fallback para categoria.
- `category-catalog`: catálogo amplo de categorias de serviço + migração/desativação do catálogo antigo, mantendo integridade referencial.
- `category-selection`: experiência de seleção múltipla de categorias com busca dinâmica no app (cadastro/edição do profissional).
- `category-suggestion`: captação de sugestões de novas categorias enviadas pelo profissional para análise administrativa manual.

### Modified Capabilities
<!-- Não há specs principais em openspec/specs/. Sem alteração de requisitos de capacidades já especificadas. -->

## Impact

- **Banco (`packages/database`)**: novo campo `ProfessionalProfile.profession String?` (migration); novo model `CategorySuggestion` (migration); seed idempotente do catálogo amplo + script/rotina de migração das categorias antigas→novas e desativação das antigas. `Category`, `ProfessionalCategory`, `ServiceRequest` mantêm a modelagem.
- **API (`apps/api`)**: `profession` incluída na leitura/edição do perfil (`profile-data.ts`, `schemas.ts`, `profile-handlers.ts`) e nos serializers públicos (busca, perfil público, chat, propostas); novo endpoint para enviar sugestão de categoria; busca de profissionais passa a considerar `profession` apenas no texto livre `q`.
- **Mobile (`src/`)**: campo de profissão no cadastro/edição do profissional; exibição com fallback nos cartões/chat/perfil; seleção de categorias com busca dinâmica e ação "Sugerir nova categoria"; tipos atualizados.
- **Compatibilidade**: `/categories` mantém o contrato (lista de categorias ativas) — a APK instalada continua funcionando, apenas com um catálogo maior. Deploy automático em `main` → Render.
