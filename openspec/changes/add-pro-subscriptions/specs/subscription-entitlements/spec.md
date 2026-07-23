## ADDED Requirements

### Requirement: Vantagens decididas no servidor
O sistema SHALL decidir no servidor, a partir do status de assinatura autoritativo, quais
vantagens um profissional recebe. As vantagens SHALL estar ativas enquanto a assinatura
estiver ativa ou em período de tolerância, e SHALL ser removidas quando a assinatura
expirar ou for cancelada e vencer. O cliente MUST NOT conseguir liberar qualquer vantagem
por conta própria.

#### Scenario: Assinante recebe vantagens
- **WHEN** o servidor avalia um profissional com assinatura ativa
- **THEN** todas as vantagens (destaque, selo, propostas ilimitadas, certificado) ficam
  disponíveis para ele

#### Scenario: Sem assinatura, sem vantagens
- **WHEN** o servidor avalia um profissional sem assinatura ativa
- **THEN** nenhuma vantagem premium é concedida e ele fica sujeito ao limite de propostas

### Requirement: Destaque na busca
O sistema SHALL ordenar os resultados de busca de profissionais de modo que assinantes
ativos apareçam acima dos não assinantes. Dentro de cada grupo (assinantes e não
assinantes), o sistema SHALL manter os critérios de ordenação já existentes (nota, número
de avaliações, experiência, recência). O destaque SHALL ser calculado no servidor.

#### Scenario: Assinante aparece no topo
- **WHEN** um cliente busca profissionais e a lista contém assinantes e não assinantes
- **THEN** os assinantes ativos são retornados antes dos não assinantes, preservando a
  ordenação escolhida dentro de cada grupo

#### Scenario: Perda de assinatura remove o destaque
- **WHEN** a assinatura de um profissional expira
- **THEN** ele deixa de ser priorizado na busca e volta a ordenar junto aos não assinantes

### Requirement: Selo de destaque no perfil
O sistema SHALL indicar, nos dados do perfil e nos resultados de busca retornados pela API,
se o profissional é um assinante ativo, para que o app exiba um selo de destaque tanto na
lista de busca quanto no perfil. O selo SHALL sumir quando a assinatura deixar de estar ativa.

#### Scenario: Perfil de assinante mostra selo
- **WHEN** um usuário abre o perfil público de um profissional com assinatura ativa
- **THEN** a resposta da API marca o profissional como destacado e o app exibe o selo

#### Scenario: Busca mostra selo no assinante
- **WHEN** um cliente vê a lista de busca contendo um profissional com assinatura ativa
- **THEN** o item da lista vem marcado como destacado e o app exibe o selo na busca

#### Scenario: Perfil sem assinatura não mostra selo
- **WHEN** um usuário abre o perfil de um profissional sem assinatura ativa
- **THEN** a resposta não marca destaque e o selo não é exibido

### Requirement: Limite mensal de propostas para não assinantes
O sistema SHALL limitar não assinantes a um número máximo de propostas por mês corrente
(configurável no servidor; valor definido: 5). Assinantes ativos SHALL enviar
propostas sem limite. A contagem e o bloqueio SHALL ser aplicados no servidor no momento de
criar a proposta.

#### Scenario: Não assinante dentro do limite
- **WHEN** um profissional sem assinatura envia uma proposta e ainda não atingiu o limite
  do mês
- **THEN** a proposta é criada normalmente

#### Scenario: Não assinante atinge o limite
- **WHEN** um profissional sem assinatura tenta enviar uma proposta já tendo atingido o
  limite mensal
- **THEN** o servidor recusa a criação e informa que o limite mensal foi atingido e que a
  assinatura remove o limite

#### Scenario: Assinante sem limite
- **WHEN** um profissional com assinatura ativa envia propostas além do limite de não
  assinantes
- **THEN** o servidor cria todas as propostas sem aplicar limite

#### Scenario: Virada de mês reinicia a contagem
- **WHEN** um novo mês corrente começa
- **THEN** a contagem de propostas do não assinante recomeça do zero
