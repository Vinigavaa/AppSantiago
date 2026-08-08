## ADDED Requirements

### Requirement: Solicitação de redefinição de senha

O sistema SHALL aceitar uma solicitação pública de redefinição de senha a partir de um email e SHALL responder sempre com sucesso e um identificador de solicitação (`requestId`), independentemente de o email possuir cadastro, para não revelar a existência da conta.

O `requestId` SHALL ser um valor aleatório imprevisível, conhecido apenas pelo aplicativo que iniciou o fluxo. O envio do email SHALL ocorrer somente quando existir uma conta com o email informado.

Cada nova solicitação para o mesmo email SHALL invalidar as solicitações anteriores, de modo que apenas um link de confirmação permaneça válido por vez.

#### Scenario: Email com conta cadastrada

- **WHEN** o aplicativo envia uma solicitação de redefinição para um email com conta
- **THEN** o sistema responde `200` com um `requestId`
- **AND** envia um email contendo um link de confirmação

#### Scenario: Email sem conta cadastrada

- **WHEN** o aplicativo envia uma solicitação de redefinição para um email sem conta
- **THEN** o sistema responde `200` com um `requestId`
- **AND** nenhum email é enviado
- **AND** a resposta é indistinguível da resposta para um email cadastrado

#### Scenario: Email inválido

- **WHEN** o aplicativo envia uma solicitação com um email em formato inválido
- **THEN** o sistema responde `400` com código `INVALID_EMAIL`

#### Scenario: Nova solicitação invalida a anterior

- **WHEN** uma segunda solicitação é criada para o mesmo email
- **THEN** o link de confirmação da solicitação anterior deixa de ser válido

### Requirement: Email de redefinição sem token exposto

O email de redefinição SHALL conter apenas um link de confirmação hospedado na API. O email SHALL NOT conter o token de redefinição em texto, nem em corpo, nem em link.

#### Scenario: Conteúdo do email

- **WHEN** o email de redefinição é enviado
- **THEN** o corpo contém um link para a página de confirmação da API
- **AND** não contém o token de redefinição de senha

### Requirement: Confirmação da solicitação pelo link do email

O sistema SHALL expor uma página web que, ao ser aberta pelo link do email com um token de confirmação válido e não expirado, marca a solicitação como confirmada e instrui o usuário a voltar ao aplicativo.

O token de confirmação SHALL expirar em 1 hora e SHALL ser armazenado apenas como hash.

#### Scenario: Link válido

- **WHEN** o usuário abre o link de confirmação dentro do prazo de validade
- **THEN** a solicitação é marcada como confirmada
- **AND** a página informa que a confirmação foi concluída e pede para voltar ao aplicativo

#### Scenario: Link expirado ou já invalidado

- **WHEN** o usuário abre um link de confirmação expirado, inexistente ou substituído por uma solicitação mais recente
- **THEN** a página responde `400` informando que o link expirou
- **AND** orienta a solicitar um novo email de redefinição

#### Scenario: Link sem token

- **WHEN** o usuário abre a página de confirmação sem o parâmetro de token
- **THEN** a página responde `400` informando que o link é inválido

### Requirement: Consulta de status da redefinição pelo aplicativo

O sistema SHALL expor uma consulta de status por `requestId` que informa se a solicitação já foi confirmada pelo link do email.

Quando a solicitação estiver confirmada, a consulta SHALL retornar o token de redefinição de senha e SHALL invalidar a solicitação, de modo que o token seja entregue uma única vez.

A consulta SHALL responder `confirmed: false` para `requestId` desconhecido, expirado ou já consumido, sem distinguir entre esses casos.

#### Scenario: Solicitação já confirmada

- **WHEN** o aplicativo consulta o status de uma solicitação confirmada
- **THEN** a resposta contém `confirmed: true` e o token de redefinição

#### Scenario: Solicitação ainda não confirmada

- **WHEN** o aplicativo consulta o status de uma solicitação não confirmada
- **THEN** a resposta contém `confirmed: false` e nenhum token

#### Scenario: Consulta repetida após entrega do token

- **WHEN** o aplicativo consulta novamente o status de uma solicitação cujo token já foi entregue
- **THEN** a resposta contém `confirmed: false` e nenhum token

#### Scenario: requestId desconhecido

- **WHEN** a consulta usa um `requestId` inexistente ou expirado
- **THEN** a resposta contém `confirmed: false`

### Requirement: Proteção contra abuso nos endpoints de redefinição

O sistema SHALL aplicar limite de requisições por IP e por email na solicitação de redefinição, e limite por IP na confirmação e na consulta de status. Ao exceder o limite, SHALL responder `429` com código `RATE_LIMITED`.

#### Scenario: Excesso de solicitações para o mesmo email

- **WHEN** o número de solicitações de redefinição para o mesmo email excede o limite da janela
- **THEN** o sistema responde `429` com código `RATE_LIMITED`

#### Scenario: Excesso de consultas de status pelo mesmo IP

- **WHEN** o número de consultas de status vindas do mesmo IP excede o limite da janela
- **THEN** o sistema responde `429` com código `RATE_LIMITED`

### Requirement: Tela de confirmação de redefinição no aplicativo

Após o envio da solicitação, o aplicativo SHALL navegar para uma tela de confirmação que exibe o email destacado, um botão de reenvio de email com cooldown de 60 segundos, um botão "Já verifiquei meu email" e uma saída para o login.

O `requestId` e o email SHALL ser persistidos em armazenamento seguro, para que a tela continue funcionando caso o aplicativo seja fechado e reaberto.

#### Scenario: Navegação após solicitar

- **WHEN** o usuário informa o email e toca em enviar na tela "Esqueci minha senha"
- **THEN** o aplicativo navega para a tela de confirmação de redefinição exibindo o email informado

#### Scenario: Cooldown do reenvio

- **WHEN** a tela de confirmação é aberta logo após o envio
- **THEN** o botão de reenvio fica desabilitado por 60 segundos, exibindo o tempo restante

#### Scenario: Reenvio do email

- **WHEN** o usuário toca no reenvio após o cooldown
- **THEN** o aplicativo cria uma nova solicitação, substitui o `requestId` persistido, reinicia o cooldown e informa que o email foi reenviado

#### Scenario: Aplicativo reaberto na tela de confirmação

- **WHEN** o aplicativo é reaberto e existe uma solicitação persistida
- **THEN** a tela de confirmação é exibida com o email persistido

#### Scenario: Sem solicitação persistida

- **WHEN** a tela de confirmação é aberta sem `requestId` disponível
- **THEN** o aplicativo redireciona para a tela de login

#### Scenario: Saída pelo link "Voltar para login"

- **WHEN** o usuário toca na saída para o login
- **THEN** a solicitação persistida é descartada e o aplicativo navega para o login

### Requirement: Ação "Já verifiquei meu email"

O botão "Já verifiquei meu email" SHALL consultar o status da solicitação e, quando confirmada, navegar para a tela "Nova senha" com o token já preenchido, descartando a solicitação persistida.

Quando a solicitação não estiver confirmada ou a consulta falhar, o aplicativo SHALL exibir mensagem de erro e permanecer na tela.

#### Scenario: Email já confirmado

- **WHEN** o usuário toca em "Já verifiquei meu email" e a solicitação está confirmada
- **THEN** o aplicativo navega para a tela "Nova senha" com o token recebido
- **AND** a solicitação persistida é descartada

#### Scenario: Email ainda não confirmado

- **WHEN** o usuário toca em "Já verifiquei meu email" e a solicitação não está confirmada
- **THEN** o aplicativo permanece na tela e exibe mensagem pedindo para abrir o link enviado por email

#### Scenario: Falha de rede na consulta

- **WHEN** a consulta de status falha por erro de rede ou indisponibilidade
- **THEN** o aplicativo exibe uma mensagem de erro tratada e mantém a tela utilizável para nova tentativa

### Requirement: Tela "Nova senha" sem entrada manual de token

A tela "Nova senha" SHALL receber o token exclusivamente por parâmetro de navegação e SHALL NOT exibir campo de token para digitação. Sem token, a tela SHALL redirecionar para a tela "Esqueci minha senha".

Após a redefinição bem-sucedida, o aplicativo SHALL levar o usuário ao login.

#### Scenario: Token recebido por parâmetro

- **WHEN** a tela "Nova senha" é aberta com um token válido
- **THEN** exibe apenas os campos de nova senha e confirmação

#### Scenario: Tela aberta sem token

- **WHEN** a tela "Nova senha" é aberta sem token
- **THEN** o aplicativo redireciona para a tela "Esqueci minha senha"

#### Scenario: Redefinição concluída

- **WHEN** o usuário informa uma nova senha válida e confirma
- **THEN** a senha é redefinida e o aplicativo leva o usuário ao login

#### Scenario: Token expirado no momento da redefinição

- **WHEN** o token já expirou ao enviar a nova senha
- **THEN** o aplicativo exibe mensagem orientando a solicitar um novo email de redefinição

## REMOVED Requirements

### Requirement: Redefinição por token copiado manualmente

**Reason**: O link do email exibia o token de redefinição em uma página web e o usuário precisava copiá-lo para um campo do aplicativo — fluxo confuso, inconsistente com a verificação de email e com o token exposto em tela.

**Migration**: O link do email passa a apenas confirmar a solicitação; o token é entregue ao aplicativo pela consulta de status e preenchido automaticamente. A página `/auth/reset-password` e o deep link `<scheme>://reset-password?token=` deixam de existir; aplicativos antigos precisam ser atualizados para recuperar a senha.
