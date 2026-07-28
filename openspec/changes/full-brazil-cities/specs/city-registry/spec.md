## ADDED Requirements

### Requirement: Cadastro oficial completo de municípios

O sistema SHALL manter um cadastro único de todos os municípios oficiais do Brasil (base IBGE, ~5.570 registros), cada um vinculado à sua Unidade Federativa (UF). Este cadastro é a única fonte de cidades usada por toda a plataforma; listas estáticas ou duplicadas SHALL NOT ser usadas.

#### Scenario: Base carregada na inicialização

- **WHEN** a carga inicial (seed) é executada em um banco sem municípios cadastrados
- **THEN** todos os municípios oficiais do Brasil são inseridos, cada um com nome e UF corretos

#### Scenario: Cidade exibida com a UF

- **WHEN** uma cidade é apresentada em qualquer tela ou resposta da API
- **THEN** ela inclui o nome do município e a sigla da UF (ex.: "Criciúma - SC", "São Paulo - SP")

### Requirement: Unicidade e idempotência da carga

O sistema SHALL impedir registros duplicados do mesmo município, garantindo unicidade por par `(nome, UF)`. A carga SHALL ser idempotente: executá-la novamente não cria duplicatas nem altera o identificador de municípios já existentes.

#### Scenario: Carga executada mais de uma vez

- **WHEN** a carga de municípios é executada em um banco que já contém municípios
- **THEN** nenhum município é duplicado e os identificadores existentes são preservados

#### Scenario: Município já referenciado é preservado

- **WHEN** um município já está referenciado por solicitações ou áreas de atuação e a carga roda novamente
- **THEN** o mesmo registro (mesmo identificador) é mantido, sem quebrar as referências existentes

### Requirement: Chave de busca normalizada

Cada município SHALL possuir uma representação normalizada do nome (sem acentos, em caixa baixa) armazenada e indexada, para permitir busca textual eficiente e insensível a acento/caixa sobre a base completa.

#### Scenario: Normalização preenchida na carga

- **WHEN** um município é inserido ou atualizado pela carga
- **THEN** sua chave de busca normalizada é preenchida a partir do nome oficial (sem acentos, minúscula)
