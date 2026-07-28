## ADDED Requirements

### Requirement: Busca de cidades por texto no servidor

O sistema SHALL expor um endpoint de busca de cidades que recebe um termo de texto (`q`) e retorna os municípios correspondentes, ordenados de forma estável (por relevância/nome e UF). A busca SHALL ser executada no servidor sobre o cadastro oficial, sem exigir que o cliente baixe a base completa.

#### Scenario: Busca por nome completo

- **WHEN** o cliente busca por "Florianópolis"
- **THEN** o servidor retorna o município "Florianópolis - SC"

#### Scenario: Busca parcial

- **WHEN** o cliente busca por "flor"
- **THEN** o servidor retorna municípios cujo nome contém o trecho digitado (ex.: "Florianópolis - SC")

#### Scenario: Termo vazio ou muito curto

- **WHEN** o cliente envia um termo vazio
- **THEN** o servidor retorna uma resposta vazia ou uma lista inicial limitada, sem erro

### Requirement: Busca insensível a acento e caixa

A busca SHALL ignorar diferenças de acentuação e de maiúsculas/minúsculas entre o termo digitado e o nome do município.

#### Scenario: Sem acento encontra com acento

- **WHEN** o cliente busca por "criciuma"
- **THEN** o servidor retorna "Criciúma - SC"

#### Scenario: Caixa diferente

- **WHEN** o cliente busca por "SAO PAULO"
- **THEN** o servidor retorna "São Paulo - SP"

### Requirement: Paginação e desempenho

A busca SHALL limitar a quantidade de resultados retornados por requisição (paginação/limite) para permanecer rápida mesmo com milhares de municípios cadastrados.

#### Scenario: Muitos correspondentes

- **WHEN** um termo corresponde a mais municípios do que o limite por página
- **THEN** o servidor retorna no máximo o limite configurado, de forma consistente e ordenada

### Requirement: Compatibilidade do endpoint legado

O endpoint existente que lista cidades (`GET /cities`) SHALL continuar respondendo com o contrato atual, para não quebrar aplicativos já instalados. O comportamento de busca SHALL ser oferecido em um endpoint separado.

#### Scenario: Cliente instalado continua funcionando

- **WHEN** um aplicativo já instalado chama `GET /cities` sem termo de busca
- **THEN** o servidor responde no formato esperado por esse cliente, sem erro
