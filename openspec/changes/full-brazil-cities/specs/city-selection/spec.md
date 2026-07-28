## ADDED Requirements

### Requirement: Seleção de cidade com busca dinâmica

O aplicativo SHALL permitir que o usuário selecione uma cidade digitando em um campo de busca, com os resultados aparecendo dinamicamente conforme digita, consumindo a busca do servidor. A seleção SHALL exibir cada cidade com nome e UF (ex.: "Belo Horizonte - MG").

#### Scenario: Resultados enquanto digita

- **WHEN** o usuário digita parte do nome de uma cidade no campo de busca
- **THEN** o app exibe dinamicamente os municípios correspondentes retornados pelo servidor

#### Scenario: Nenhum resultado

- **WHEN** o termo digitado não corresponde a nenhum município
- **THEN** o app exibe um estado vazio claro, sem travar nem permitir seleção inválida

### Requirement: Cidade única na criação/edição de solicitação

Ao criar ou editar uma solicitação de serviço, o cliente SHALL selecionar exatamente uma cidade válida do cadastro oficial, usando o mecanismo de busca dinâmica.

#### Scenario: Cliente escolhe a cidade da solicitação

- **WHEN** o cliente cria uma solicitação e busca/seleciona uma cidade
- **THEN** a solicitação é salva vinculada ao município oficial escolhido

#### Scenario: Solicitação exige cidade válida

- **WHEN** o cliente tenta salvar uma solicitação sem uma cidade válida selecionada
- **THEN** o app impede o envio e sinaliza que a cidade é obrigatória

### Requirement: Área de atuação do profissional com múltiplas cidades

O profissional SHALL poder selecionar uma ou mais cidades de atuação usando o mesmo mecanismo de busca, podendo adicionar e remover cidades facilmente. O sistema SHALL impedir que a mesma cidade seja adicionada mais de uma vez.

#### Scenario: Adicionar várias cidades

- **WHEN** o profissional busca e adiciona várias cidades à sua área de atuação
- **THEN** todas as cidades selecionadas são salvas como sua cobertura, sem duplicatas

#### Scenario: Remover cidade

- **WHEN** o profissional remove uma cidade da sua área de atuação
- **THEN** aquela cidade deixa de compor sua cobertura

#### Scenario: Tentar adicionar cidade repetida

- **WHEN** o profissional tenta adicionar uma cidade que já está na sua área de atuação
- **THEN** o sistema não cria duplicata

### Requirement: Regras de localização baseadas no cadastro único

As funcionalidades que dependem de localização SHALL usar exclusivamente o cadastro oficial de municípios. As oportunidades exibidas ao profissional SHALL considerar apenas as cidades definidas como sua área de atuação, e a busca de profissionais SHALL retornar apenas profissionais que atendem à cidade selecionada pelo cliente.

#### Scenario: Oportunidades restritas à área de atuação

- **WHEN** o profissional visualiza oportunidades
- **THEN** apenas solicitações em cidades da sua área de atuação são exibidas

#### Scenario: Busca de profissionais por cidade

- **WHEN** o cliente filtra a busca de profissionais por uma cidade
- **THEN** apenas profissionais que atendem àquela cidade são retornados
