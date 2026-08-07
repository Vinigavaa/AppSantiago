## ADDED Requirements

### Requirement: A tela sempre corresponde ao profissional selecionado

A tela de perfil público SHALL exibir exclusivamente dados do profissional identificado pelo parâmetro `id` da rota atual. Dados de um profissional aberto anteriormente MUST NOT permanecer visíveis depois que o usuário navega para outro `id`.

#### Scenario: Abrir um segundo perfil logo após o primeiro

- **WHEN** o usuário abre o perfil do profissional A, volta, e em seguida abre o perfil do profissional B
- **THEN** a tela de B nunca exibe nome, foto, categoria, estatísticas, portfólio ou avaliações de A, em nenhum instante

#### Scenario: Entrada por caminhos diferentes

- **WHEN** o usuário chega ao perfil de um profissional pela busca, pelo chat ou pela lista de propostas recebidas
- **THEN** o comportamento é o mesmo: a tela mostra apenas o profissional correspondente ao `id` daquela navegação

#### Scenario: Reabrir o mesmo profissional

- **WHEN** o usuário abre novamente o perfil do mesmo profissional que acabou de visitar
- **THEN** a tela exibe os dados desse profissional, recarregados do servidor

### Requirement: Estado de carregamento enquanto o perfil correto não chega

Enquanto os dados do profissional selecionado estiverem sendo buscados, a tela SHALL exibir o estado de carregamento, mantendo visíveis apenas o cabeçalho da tela e o botão de voltar.

#### Scenario: Carregamento após trocar de profissional

- **WHEN** o usuário abre o perfil do profissional B e a requisição ainda não retornou
- **THEN** a tela exibe o indicador de carregamento no lugar do conteúdo do perfil
- **AND** não exibe conteúdo de nenhum profissional

#### Scenario: Ações indisponíveis durante o carregamento

- **WHEN** a tela está em estado de carregamento
- **THEN** os botões "Conversar", "Solicitar Serviço", "Desbloquear" e a ação de bloquear não estão disponíveis para toque

### Requirement: Falha ao carregar o perfil

Quando a busca dos dados falhar, a tela SHALL exibir a mensagem de erro com a ação de tentar novamente, sem exibir dados de qualquer profissional carregado anteriormente.

#### Scenario: Erro ao carregar o segundo perfil

- **WHEN** o usuário abre o perfil do profissional B e a requisição falha
- **THEN** a tela exibe a mensagem de erro e o botão "Tentar novamente"
- **AND** não exibe os dados do profissional A visitado antes

#### Scenario: Tentar novamente após falha

- **WHEN** o usuário toca em "Tentar novamente" na tela de erro
- **THEN** a tela volta ao estado de carregamento e busca novamente o profissional do `id` atual
