## ADDED Requirements

### Requirement: Campo de profissão em texto livre

O perfil do profissional SHALL possuir um campo "profissão" em texto livre, definido pelo próprio profissional, usado apenas para apresentação. O campo SHALL ser opcional e editável no cadastro e na edição do perfil.

#### Scenario: Profissional define a profissão

- **WHEN** o profissional informa "Especialista em Energia Solar" no campo profissão
- **THEN** o valor é salvo no perfil e exibido como sua apresentação

#### Scenario: Profissão vazia é permitida

- **WHEN** o profissional deixa a profissão em branco
- **THEN** o perfil é salvo normalmente, sem exigir o campo

### Requirement: Exibição da profissão com fallback para categoria

Onde a apresentação do profissional é exibida (perfil público, cartões de busca e chat), o sistema SHALL mostrar a profissão livre quando preenchida e, quando vazia, SHALL usar a primeira categoria de atuação como rótulo. Quando não houver nem profissão nem categoria, o rótulo SHALL ficar ausente sem erro.

#### Scenario: Com profissão preenchida

- **WHEN** o profissional tem profissão "Marceneiro Artesanal"
- **THEN** os cartões, o chat e o perfil público exibem "Marceneiro Artesanal"

#### Scenario: Sem profissão, com categoria

- **WHEN** o profissional não preencheu a profissão mas tem a categoria "Marcenaria"
- **THEN** a apresentação exibida cai de volta para "Marcenaria"

#### Scenario: Sem profissão e sem categoria

- **WHEN** o profissional não tem profissão nem categorias
- **THEN** nenhum rótulo de apresentação é exibido, sem quebrar a tela

### Requirement: Profissão não é critério estruturado de busca ou recomendação

A profissão livre SHALL NOT ser usada como filtro estruturado nem como critério de recomendação/matching. Toda a lógica de busca por área, oportunidades e recomendação SHALL usar exclusivamente as categorias de atuação. A profissão MAY ser considerada apenas como correspondência no campo de busca textual livre.

#### Scenario: Recomendação ignora a profissão

- **WHEN** as oportunidades de um profissional são calculadas
- **THEN** o resultado depende apenas das categorias de atuação, nunca do texto da profissão

#### Scenario: Busca textual livre pode casar a profissão

- **WHEN** o cliente digita um termo que aparece na profissão de um profissional
- **THEN** esse profissional pode aparecer no resultado da busca textual, sem que a profissão vire um filtro estruturado
