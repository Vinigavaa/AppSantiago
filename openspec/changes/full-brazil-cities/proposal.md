## Why

Hoje a plataforma só conhece 7 cidades de Santa Catarina (semeadas em `seed.ts`). Isso impede que profissionais e clientes de qualquer outra região do Brasil usem o app: não há como escolher a cidade real onde atuam ou onde precisam do serviço. Para o lançamento em produção, o app precisa cobrir **todos os municípios oficiais do Brasil** com uma seleção rápida, precisa e consistente em toda a plataforma.

## What Changes

- **Carga oficial de municípios**: substituir a lista fixa de 7 cidades pela base completa do IBGE (~5.570 municípios), cada um vinculado à sua UF. Carga por seed idempotente (upsert por `[name, state]`), preservando os IDs de cidades já existentes referenciados por solicitações e coberturas atuais.
- **Busca inteligente no servidor**: novo endpoint `GET /cities/search?q=` que faz correspondência parcial ignorando acentos e maiúsculas/minúsculas, com paginação e ordenação estável. Suporta digitação incremental (typeahead) sem baixar milhares de registros para o dispositivo.
- **Coluna normalizada + índice**: adicionar coluna `searchName` (nome sem acento, minúsculo) em `City`, populada na carga, com índice para busca performática mesmo com milhares de linhas.
- **Seletor de cidade no mobile**: componente de busca com resultados dinâmicos, usado em: criação/edição de solicitação (single-select) e área de atuação do profissional (multi-select, adicionar/remover, sem duplicar).
- **Regras de localização revisadas**: confirmar que oportunidades ao profissional consideram apenas suas cidades de atuação e que a busca de profissionais retorna apenas quem atende a cidade selecionada — comportamento já existente, agora validado sobre a base completa.
- **Compatibilidade da APK instalada**: o endpoint atual `GET /cities` (lista completa) é **mantido** para não quebrar o cliente já instalado. O novo comportamento de busca vive em `GET /cities/search`. Não há mudança destrutiva de contrato.

Fora de escopo (decidido com o usuário): o cliente **não** ganha cidade fixa no perfil — continua escolhendo a cidade por solicitação, e a "cidade principal" segue derivada da última solicitação.

## Capabilities

### New Capabilities
- `city-registry`: cadastro único e oficial de municípios brasileiros (carga IBGE, vínculo com UF, unicidade, base pronta para produção).
- `city-search`: busca de cidades por texto parcial ignorando acento e caixa, paginada, servida pelo backend para escalar a milhares de municípios.
- `city-selection`: experiência de seleção de cidade no mobile (typeahead single/multi-select) reutilizada em cadastro de solicitação e área de atuação do profissional.

### Modified Capabilities
<!-- Não há specs principais existentes em openspec/specs/. Sem alteração de requisitos de capacidades já especificadas. -->

## Impact

- **Banco (`packages/database`)**: nova coluna `City.searchName` + índice (migration); `seed.ts` passa a carregar a base IBGE a partir de um JSON estático versionado no repo (upsert idempotente). Sem alteração em `ProfessionalCity`, `ServiceRequest` ou `ClientProfile`.
- **API (`apps/api`)**: novo handler/rota `GET /cities/search` (query param `q`, paginação); `GET /cities` inalterado. Handlers de busca de profissionais e oportunidades permanecem, apenas validados sobre a base maior.
- **Mobile (`src/`)**: novo componente de busca de cidade (typeahead) consumindo `/cities/search`; substitui o carregamento total no seletor de cidade em solicitação e na área de atuação do profissional. `MultiSelectModal` genérico continua para outros usos (categorias).
- **Dados**: arquivo estático de municípios do IBGE adicionado ao repo. Sem secrets, sem dependência de rede em produção.
- **Compatibilidade**: APK instalada preservada (contrato de `/cities` mantido). Deploy automático em `main` → Render.
