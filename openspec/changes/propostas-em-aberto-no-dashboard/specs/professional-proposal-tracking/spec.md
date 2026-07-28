## ADDED Requirements

### Requirement: Indicador de propostas em aberto no dashboard
O dashboard do profissional SHALL exibir um card "Propostas em aberto" com a
quantidade de propostas enviadas que ainda aguardam resposta do cliente, seguindo
o mesmo padrão visual dos demais indicadores.

#### Scenario: Contagem exibida
- **WHEN** o profissional tem 3 propostas com status pendente
- **THEN** o card "Propostas em aberto" exibe o valor 3

#### Scenario: Nenhuma proposta pendente
- **WHEN** o profissional não tem propostas pendentes
- **THEN** o card exibe 0 e continua visível

#### Scenario: Card leva à lista filtrada
- **WHEN** o profissional toca no card "Propostas em aberto"
- **THEN** a tela de serviços abre com o filtro "Propostas em aberto" já selecionado

### Requirement: Indicador de propostas recusadas no dashboard
O dashboard SHALL exibir um card "Propostas recusadas" com a quantidade de propostas
que o cliente não aceitou, levando à tela de serviços no filtro correspondente.

#### Scenario: Card leva à lista filtrada
- **WHEN** o profissional toca no card "Propostas recusadas"
- **THEN** a tela de serviços abre com o filtro "Propostas recusadas" já selecionado

### Requirement: Listagem de propostas em aberto
A tela de serviços SHALL oferecer um filtro "Propostas em aberto" que lista apenas
as propostas pendentes do profissional, ordenadas da mais recente para a mais antiga.

#### Scenario: Lista exibida
- **WHEN** o filtro "Propostas em aberto" é selecionado
- **THEN** apenas propostas pendentes do profissional são exibidas, sem contratos

#### Scenario: Lista vazia
- **WHEN** o profissional não tem propostas pendentes e seleciona o filtro
- **THEN** um estado vazio explica que propostas enviadas aguardando resposta aparecerão ali

#### Scenario: Falha de carregamento
- **WHEN** a busca das propostas pendentes falha
- **THEN** a tela exibe a mensagem de erro com a opção de tentar novamente

### Requirement: Informações exibidas em cada proposta
Cada proposta listada, em aberto ou recusada, SHALL exibir título do serviço, nome
do cliente, categoria do serviço, data de envio, valor proposto e situação atual.

#### Scenario: Proposta em aberto
- **WHEN** uma proposta pendente é exibida
- **THEN** mostra título, nome do cliente, categoria, data de envio, valor e a
  indicação de que aguarda decisão do cliente

#### Scenario: Proposta recusada
- **WHEN** uma proposta recusada é exibida
- **THEN** mostra os mesmos dados e a indicação clara de que não foi aceita

#### Scenario: Distinção visual entre situações
- **WHEN** o profissional alterna entre os filtros de em aberto e recusadas
- **THEN** as duas situações são visualmente distinguíveis sem depender só do texto

### Requirement: Sincronização dos indicadores
Os indicadores do dashboard e as listagens SHALL refletir a situação real da conta
sempre que a tela for aberta, sem exigir ação manual do profissional.

#### Scenario: Após enviar uma proposta
- **WHEN** o profissional envia uma proposta e volta ao dashboard
- **THEN** a contagem de propostas em aberto já inclui a proposta enviada

#### Scenario: Após o cliente recusar
- **WHEN** uma proposta é recusada pelo cliente e o profissional abre o dashboard
- **THEN** a proposta deixa de ser contada em aberto e passa a ser contada em recusadas

#### Scenario: Após o cliente aceitar
- **WHEN** uma proposta é aceita e o profissional abre o dashboard
- **THEN** a proposta deixa de ser contada em aberto e o serviço aparece entre os
  serviços para iniciar

#### Scenario: Após cancelamento
- **WHEN** uma proposta pendente é cancelada
- **THEN** ela deixa de ser contada entre as propostas em aberto

### Requirement: Acesso restrito ao profissional dono das propostas
O backend SHALL devolver apenas as propostas do profissional autenticado e MUST
recusar o acesso a usuários que não sejam profissionais.

#### Scenario: Usuário cliente tenta acessar
- **WHEN** um usuário com papel de cliente chama o endpoint de propostas pendentes
- **THEN** a API responde com erro de acesso negado

#### Scenario: Propostas de outro profissional
- **WHEN** o endpoint é chamado por um profissional
- **THEN** nenhuma proposta de outro profissional aparece no resultado
