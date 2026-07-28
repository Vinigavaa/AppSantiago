## ADDED Requirements

### Requirement: Catálogo amplo de categorias de serviço

O sistema SHALL manter um catálogo amplo de categorias de atuação, cobrindo as principais áreas de prestação de serviço do Brasil (construção, reformas, elétrica, hidráulica, limpeza, tecnologia, design, marketing, saúde, beleza, pets, eventos, entre outras). A carga SHALL ser idempotente (upsert por identificador estável), sem duplicar categorias em reexecuções.

#### Scenario: Catálogo carregado

- **WHEN** a carga de categorias é executada
- **THEN** as categorias amplas ficam disponíveis e ativas para seleção

#### Scenario: Carga reexecutada

- **WHEN** a carga roda novamente
- **THEN** nenhuma categoria é duplicada e as existentes são preservadas

### Requirement: Migração e desativação do catálogo antigo

As categorias antigas do tipo profissão SHALL ser mapeadas para as novas categorias amplas equivalentes. As referências de profissionais e de solicitações que apontavam para categorias antigas SHALL ser movidas para as novas equivalentes, sem perder o vínculo. As categorias antigas SHALL ser desativadas (deixam de aparecer para seleção) e SHALL NOT ser removidas do banco, preservando a integridade referencial.

#### Scenario: Referências migradas

- **WHEN** um profissional tinha a categoria antiga "Eletricista"
- **THEN** após a migração ele passa a ter a categoria nova equivalente ("Elétrica"), sem duplicar e sem perder a atuação

#### Scenario: Solicitação migrada

- **WHEN** uma solicitação existente apontava para uma categoria antiga
- **THEN** ela passa a apontar para a categoria nova equivalente

#### Scenario: Antiga desativada, não removida

- **WHEN** a migração termina
- **THEN** as categorias antigas ficam inativas (fora da seleção) mas continuam existindo no banco

#### Scenario: Sem duplicar quando o profissional já tem a nova

- **WHEN** um profissional tinha a antiga "Eletricista" e também já a nova "Elétrica"
- **THEN** após a migração ele fica com uma única entrada de "Elétrica", sem duplicata

### Requirement: Toda a lógica usa apenas categorias ativas do catálogo

Busca de profissionais, oportunidades, filtros, recomendações, criação de solicitações, dashboards e estatísticas SHALL usar exclusivamente as categorias de atuação do catálogo. A seleção de categorias SHALL oferecer apenas categorias ativas.

#### Scenario: Seleção só mostra ativas

- **WHEN** o profissional abre a seleção de categorias
- **THEN** apenas categorias ativas do catálogo são apresentadas

#### Scenario: Criação de solicitação usa categoria válida

- **WHEN** o cliente cria uma solicitação
- **THEN** a solicitação é vinculada a uma categoria ativa do catálogo
