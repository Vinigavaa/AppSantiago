## ADDED Requirements

### Requirement: Denúncia de conteúdo e de usuário
O aplicativo SHALL permitir que um usuário autenticado denuncie um usuário ou um item
de conteúdo gerado por usuário. Os alvos suportados MUST ser: `USER`, `MESSAGE`,
`REVIEW`, `SERVICE_REQUEST` e `PORTFOLIO_ITEM`. Toda denúncia MUST registrar o
denunciante, o tipo e o id do alvo, o motivo e a data.

#### Scenario: Denúncia aceita
- **WHEN** um usuário autenticado envia uma denúncia com tipo de alvo suportado, id de
  alvo existente e motivo válido
- **THEN** o backend registra a denúncia com status pendente e responde 201

#### Scenario: Alvo inexistente
- **WHEN** o id do alvo não corresponde a nenhum registro do tipo informado
- **THEN** o backend responde 404 com código `NOT_FOUND` e nada é registrado

#### Scenario: Usuário não autenticado
- **WHEN** a requisição de denúncia chega sem sessão válida
- **THEN** o backend responde 401 e nada é registrado

### Requirement: Motivos de denúncia
A denúncia MUST informar um motivo de uma lista fechada: `SPAM`, `ASSEDIO`,
`CONTEUDO_SEXUAL`, `VIOLENCIA`, `DISCURSO_DE_ODIO`, `GOLPE`, `OUTRO`. Um detalhe em
texto livre de até 500 caracteres SHALL ser opcional, exceto para o motivo `OUTRO`,
em que o detalhe MUST ser obrigatório com no mínimo 10 caracteres.

#### Scenario: Motivo fora da lista
- **WHEN** o motivo enviado não pertence à lista fechada
- **THEN** o backend responde 400 com código `INVALID_DATA`

#### Scenario: Motivo OUTRO sem detalhe
- **WHEN** o motivo é `OUTRO` e o detalhe está vazio ou tem menos de 10 caracteres
- **THEN** o backend responde 400 com código `INVALID_DATA` e mensagem pedindo a descrição

#### Scenario: Detalhe acima do limite
- **WHEN** o detalhe tem mais de 500 caracteres
- **THEN** o backend responde 400 com código `INVALID_DATA`

### Requirement: Proteção contra abuso da denúncia
O backend SHALL impedir o uso da denúncia como ferramenta de flood. Uma segunda
denúncia do mesmo denunciante sobre o mesmo alvo MUST ser idempotente: o registro
existente é mantido e a resposta é de sucesso, sem criar duplicata. O sistema MUST
limitar o volume de denúncias por usuário em uma janela de tempo.

#### Scenario: Denúncia repetida do mesmo alvo
- **WHEN** o mesmo usuário denuncia o mesmo alvo uma segunda vez
- **THEN** nenhum registro novo é criado e a resposta é de sucesso

#### Scenario: Excesso de denúncias
- **WHEN** um usuário ultrapassa o limite de denúncias na janela configurada
- **THEN** o backend responde 429 com mensagem de limite atingido

#### Scenario: Denúncia de si mesmo
- **WHEN** o alvo é o próprio usuário autenticado
- **THEN** o backend responde 400 com código `INVALID_DATA`

### Requirement: Retorno ao denunciante
O aplicativo SHALL confirmar ao denunciante que a denúncia foi recebida e informar
que o caso é analisado em até 24 horas. A confirmação MUST aparecer também quando a
denúncia era repetida.

#### Scenario: Confirmação em tela
- **WHEN** a denúncia é aceita pelo backend
- **THEN** o app exibe uma confirmação informando o prazo de análise de até 24 horas

#### Scenario: Falha de rede na denúncia
- **WHEN** a requisição falha por rede ou erro do servidor
- **THEN** o app exibe mensagem de erro e mantém o formulário preenchido para nova tentativa

### Requirement: Aviso à moderação
A cada denúncia registrada, o backend SHALL enviar um e-mail para o endereço de
moderação configurado, contendo o identificador da denúncia, o tipo e id do alvo, o
motivo, o detalhe e o identificador do denunciante. A falha no envio do e-mail MUST
ser registrada em log e NÃO MUST impedir o registro da denúncia.

#### Scenario: Aviso enviado
- **WHEN** uma denúncia nova é registrada
- **THEN** um e-mail é enviado ao endereço de moderação com os dados do caso

#### Scenario: Falha no envio do aviso
- **WHEN** o provedor de e-mail retorna erro
- **THEN** a denúncia permanece registrada, o erro é logado e o denunciante recebe confirmação

### Requirement: Pontos de denúncia no aplicativo
O aplicativo SHALL oferecer a ação "Denunciar" no perfil público do profissional, no
perfil do cliente, no cabeçalho da conversa, em cada mensagem recebida, em cada
avaliação recebida e na oportunidade/solicitação de serviço. Ao denunciar um usuário,
o app SHALL oferecer bloquear o mesmo usuário na sequência.

#### Scenario: Denúncia a partir de uma mensagem
- **WHEN** o usuário mantém pressionada uma mensagem recebida e escolhe "Denunciar"
- **THEN** o app abre o formulário de motivos com o alvo `MESSAGE` já definido

#### Scenario: Bloquear após denunciar usuário
- **WHEN** o usuário conclui a denúncia de um usuário
- **THEN** o app oferece a ação de bloquear esse usuário, e ao confirmar o bloqueio é aplicado

#### Scenario: Denúncia do próprio conteúdo não é oferecida
- **WHEN** o conteúdo exibido é de autoria do próprio usuário
- **THEN** a ação "Denunciar" não é exibida
