## ADDED Requirements

### Requirement: Enviar sugestão de nova categoria

Quando não encontrar uma categoria adequada, o profissional SHALL poder sugerir uma nova categoria informando um nome. A sugestão SHALL ser registrada para análise administrativa com status pendente e SHALL ser vinculada ao profissional que a enviou.

#### Scenario: Sugestão registrada

- **WHEN** o profissional envia a sugestão "Impermeabilização"
- **THEN** a sugestão é gravada com status pendente, associada a ele

#### Scenario: Nome inválido

- **WHEN** o profissional envia uma sugestão com nome vazio ou muito curto
- **THEN** o sistema rejeita o envio e informa o motivo, sem gravar

### Requirement: Sugestão não fica disponível automaticamente

Uma sugestão pendente SHALL NOT aparecer para outros usuários nem ser oferecida na seleção de categorias, e SHALL NOT virar uma categoria ativa sem aprovação administrativa (manual nesta entrega).

#### Scenario: Sugestão não aparece na seleção

- **WHEN** outro profissional abre a seleção de categorias
- **THEN** a sugestão pendente não aparece entre as categorias disponíveis

#### Scenario: Aprovação é administrativa

- **WHEN** uma sugestão é enviada
- **THEN** ela permanece pendente até uma análise administrativa, sem se tornar categoria ativa automaticamente
