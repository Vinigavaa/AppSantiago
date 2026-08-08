## ADDED Requirements

### Requirement: Filtro de texto ofensivo no backend
O backend SHALL rejeitar texto livre enviado por usuário que contenha termos de uma
lista de conteúdo proibido em português. A checagem MUST ocorrer antes de qualquer
persistência e MUST valer independentemente do que o aplicativo faça no cliente.

#### Scenario: Texto ofensivo rejeitado
- **WHEN** um usuário envia texto contendo um termo da lista proibida
- **THEN** o backend responde 400 com código `OFFENSIVE_CONTENT` e mensagem explicando
  que o conteúdo viola as regras da comunidade, e nada é gravado

#### Scenario: Texto limpo aceito
- **WHEN** o texto não contém termos da lista
- **THEN** a operação segue normalmente

### Requirement: Superfícies cobertas pelo filtro
O filtro MUST ser aplicado a: conteúdo e legenda de mensagem de chat, título e
descrição de solicitação de serviço, biografia e profissão do perfil profissional,
nome de exibição do usuário, título e descrição de item de portfólio, sugestão de
categoria e comentário de avaliação.

#### Scenario: Mensagem de chat
- **WHEN** a mensagem enviada contém termo proibido
- **THEN** a mensagem não é criada, não é entregue por websocket e não gera notificação

#### Scenario: Solicitação de serviço
- **WHEN** o título ou a descrição da solicitação contém termo proibido
- **THEN** a solicitação não é criada nem atualizada

#### Scenario: Perfil profissional
- **WHEN** a biografia, a profissão ou o nome de exibição contém termo proibido
- **THEN** o perfil não é atualizado

#### Scenario: Avaliação
- **WHEN** o comentário da avaliação contém termo proibido
- **THEN** a avaliação não é criada

#### Scenario: Item de portfólio
- **WHEN** o título ou a descrição do item contém termo proibido
- **THEN** o item não é criado

### Requirement: Normalização antes da checagem
A comparação MUST ser resistente a variações simples de escrita: diferença de caixa,
acentuação, substituição de letras por números ou símbolos equivalentes, repetição de
caracteres e separadores inseridos entre as letras. A checagem MUST casar por limite
de palavra, para não bloquear palavras legítimas que contenham um termo proibido.

#### Scenario: Variação com acento e caixa
- **WHEN** o termo aparece com acentos ou em caixa alta
- **THEN** ele é detectado

#### Scenario: Variação com números e separadores
- **WHEN** o termo aparece com letras trocadas por números ou com pontos entre as letras
- **THEN** ele é detectado

#### Scenario: Palavra legítima que contém o termo
- **WHEN** o texto contém uma palavra legítima que apenas encapsula um termo proibido
- **THEN** o texto é aceito

### Requirement: Manutenção da lista de termos
A lista de termos proibidos MUST viver em um único módulo do backend, em um formato
simples de editar, e sua alteração NÃO MUST exigir mudança de código em outros
módulos. A lista NÃO MUST ser exposta por nenhum endpoint público.

#### Scenario: Novo termo adicionado
- **WHEN** um termo é acrescentado à lista
- **THEN** todas as superfícies cobertas passam a rejeitá-lo, sem alteração nos handlers

#### Scenario: Lista não é exposta
- **WHEN** qualquer endpoint público é consultado
- **THEN** nenhum retorno inclui a lista de termos

### Requirement: Mensagem ao usuário e registro
A rejeição SHALL informar ao usuário, em português e sem citar o termo detectado, que
o conteúdo viola as regras da comunidade. O backend MUST registrar em log a superfície
e o usuário envolvidos, sem gravar o texto rejeitado por inteiro.

#### Scenario: Feedback no aplicativo
- **WHEN** o app recebe `OFFENSIVE_CONTENT`
- **THEN** exibe a mensagem de violação das regras e mantém o texto para o usuário corrigir

#### Scenario: Log da rejeição
- **WHEN** o filtro rejeita um envio
- **THEN** o log registra a superfície e o id do usuário, sem o conteúdo integral
