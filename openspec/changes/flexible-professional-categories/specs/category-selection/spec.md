## ADDED Requirements

### Requirement: Seleção múltipla de categorias com busca dinâmica

No cadastro e na edição do perfil, o profissional SHALL poder selecionar múltiplas categorias de atuação por meio de um campo de busca que filtra as categorias por nome conforme digita, ignorando acentos e maiúsculas/minúsculas. O profissional SHALL poder adicionar e remover categorias facilmente, sem duplicar a mesma categoria.

#### Scenario: Buscar e adicionar

- **WHEN** o profissional digita "elé" na busca de categorias
- **THEN** as categorias correspondentes (ex.: "Elétrica") aparecem para seleção

#### Scenario: Busca ignora acento e caixa

- **WHEN** o profissional digita "eletrica" ou "ELETRICA"
- **THEN** a categoria "Elétrica" aparece nos resultados

#### Scenario: Selecionar várias e remover

- **WHEN** o profissional adiciona "Elétrica" e "Automação Residencial" e depois remove "Elétrica"
- **THEN** sua atuação fica apenas com "Automação Residencial"

#### Scenario: Não duplica

- **WHEN** o profissional tenta adicionar uma categoria que já selecionou
- **THEN** o sistema não cria uma entrada duplicada

### Requirement: Profissional multidisciplinar

O profissional SHALL poder selecionar quantas categorias desejar, representando atuação multidisciplinar. Todas as categorias selecionadas SHALL ser consideradas na exibição para clientes e na correspondência de oportunidades.

#### Scenario: Várias categorias distintas

- **WHEN** o profissional seleciona "Fotografia", "Filmagem" e "Edição de Vídeo"
- **THEN** ele aparece para clientes em qualquer uma dessas categorias e recebe oportunidades de todas elas
