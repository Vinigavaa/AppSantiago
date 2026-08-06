## MODIFIED Requirements

### Requirement: Eventos que merecem aviso
O sistema SHALL tratar como "evento de aviso" as notificações dos tipos `PROPOSAL_RECEIVED`, `PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED`, `SERVICE_UPDATED` e `REVIEW_RECEIVED`, além das mensagens de chat recebidas. Demais tipos MUST alimentar apenas o indicador da aba, sem toast.

Mensagem de chat MUST gerar aviso a partir do evento `message:new` do canal realtime, e não da notificação `MESSAGE_RECEIVED` — assim a contagem continua vindo de uma fonte só e o aviso não é duplicado.

O evento `message:new` MUST carregar o primeiro nome de quem enviou, para que o aviso identifique a origem sem nenhuma consulta do app.

Cobertura resultante por perfil:

| Situação | Cliente | Profissional |
| --- | --- | --- |
| Recebeu proposta | sim | — |
| Proposta aceita/recusada pelo cliente | — | sim |
| Serviço cancelado pela outra parte | sim | sim |
| Solicitação excluída pelo cliente | — | sim |
| Avaliação recebida | sim | sim |
| Mensagem no chat | sim | sim |

#### Scenario: Cliente recebe proposta
- **WHEN** um profissional envia uma proposta para a solicitação do cliente
- **THEN** o cliente vê um toast de proposta recebida além do indicador em "Propostas"

#### Scenario: Proposta aceita
- **WHEN** o cliente aceita a proposta de um profissional
- **THEN** o profissional vê um toast de proposta aceita além do indicador em "Serviços"

#### Scenario: Serviço cancelado pelo profissional
- **WHEN** o profissional cancela um serviço já contratado
- **THEN** o cliente vê um toast de atenção informando o cancelamento

#### Scenario: Solicitação excluída pelo cliente
- **WHEN** o cliente exclui uma solicitação com propostas pendentes
- **THEN** cada profissional com proposta pendente vê um toast informando a exclusão

#### Scenario: Avaliação recebida
- **WHEN** o profissional avalia o cliente ao final do serviço
- **THEN** o cliente vê um toast de avaliação recebida além do indicador em "Perfil"

#### Scenario: Mensagem de chat em outra tela
- **WHEN** o usuário recebe uma mensagem enquanto está em qualquer tela que não seja aquela conversa
- **THEN** um toast com o primeiro nome de quem enviou e o trecho da mensagem é exibido, e o indicador de "Mensagens" é incrementado

#### Scenario: Mensagem só com foto
- **WHEN** a mensagem recebida não tem texto, apenas anexo
- **THEN** o aviso mostra a indicação de foto no lugar do trecho

#### Scenario: Mensagem na conversa aberta
- **WHEN** o usuário recebe uma mensagem da conversa que já está aberta na tela
- **THEN** nenhum toast é exibido, pois a mensagem já aparece na própria conversa

### Requirement: Entrega dos eventos pendentes
O aviso SHALL ser disparado pelo evento recebido no canal realtime, e não pelo estado pendente devolvido em uma consulta periódica.

Ao receber `notification:new`, o app MUST exibir o toast imediatamente, usando `title` e `message` do próprio evento. Ao receber `message:new`, MUST montar o aviso a partir da mensagem recebida.

`GET /notifications/badges` SHALL continuar devolvendo `events` — a lista dos avisos ainda pendentes, ordenados do mais recente para o mais antigo e limitados a 5 — usada na reconciliação por conexão (para recuperar o que ocorreu com o app desconectado) e pelas versões do app já instaladas. Cada item MUST conter `id`, `type`, `title` e `message`.

Os textos MUST vir da própria notificação — o app não reescreve conteúdo por tipo, então toast, central e push contam sempre a mesma história.

#### Scenario: Evento com o app conectado
- **WHEN** o evento ocorre com o app aberto e conectado
- **THEN** o toast aparece em menos de 300ms, sem nenhuma requisição adicional

#### Scenario: Evento com o app desconectado
- **WHEN** o evento ocorre enquanto o app está desconectado e a conexão é restabelecida em seguida
- **THEN** o aviso é recuperado pela reconciliação e o toast é exibido na volta

#### Scenario: Sem eventos pendentes
- **WHEN** o usuário não tem notificações não lidas dos tipos de aviso
- **THEN** `events` é uma lista vazia

#### Scenario: Muitos eventos acumulados
- **WHEN** o usuário tem 12 notificações de aviso não lidas
- **THEN** `events` traz as 5 mais recentes e as contagens das abas seguem refletindo as 12

#### Scenario: Evento já visualizado
- **WHEN** a notificação foi marcada como lida (o usuário abriu a aba correspondente)
- **THEN** ela deixa de aparecer em `events`

### Requirement: Exibição do aviso
O app SHALL exibir um toast para cada evento que ainda não foi exibido na sessão atual, sobre a tela em que o usuário estiver, sem bloquear a interação.

O toast MUST conter o título e a mensagem da notificação e um ícone que identifique a situação. O ícone MUST vir da biblioteca de ícones já usada no app (`@expo/vector-icons`/Ionicons), no mesmo estilo e tamanho das demais telas:

| Situação | Ícone | Tom |
| --- | --- | --- |
| Proposta recebida | `document-text` | neutro |
| Proposta aceita | `checkmark-circle` | sucesso |
| Proposta não selecionada | `information-circle` | neutro |
| Serviço cancelado / atualizado | `alert-circle` | atenção |
| Avaliação recebida | `star` | sucesso |
| Mensagem no chat | `chatbubble-ellipses` | neutro |

#### Scenario: Profissional recebe o aceite com o app aberto
- **WHEN** o cliente aceita a proposta enquanto o profissional navega em qualquer tela
- **THEN** aparece um toast de sucesso com o título e a mensagem da notificação, e o profissional continua conseguindo tocar, rolar e navegar normalmente

#### Scenario: Cliente recebe o cancelamento com o app aberto
- **WHEN** o profissional cancela um serviço já contratado enquanto o cliente usa o app
- **THEN** aparece um toast de atenção informando o cancelamento e onde a proposta pode ser reconsultada

#### Scenario: Toast não bloqueia a tela
- **WHEN** um toast está visível
- **THEN** toques na área abaixo dele atingem a tela normalmente

#### Scenario: Dispensa automática
- **WHEN** um toast é exibido
- **THEN** ele desaparece sozinho após alguns segundos, sem exigir ação do usuário

#### Scenario: Dispensa manual
- **WHEN** o usuário toca no toast
- **THEN** ele é dispensado imediatamente e o próximo da fila (se houver) é exibido

### Requirement: Um aviso por evento
O app SHALL exibir no máximo um toast por evento na mesma sessão, identificando o evento pelo `id` da notificação (ou pelo `id` da mensagem, no caso do chat).

Vários eventos MUST ser exibidos em fila, um de cada vez, nunca empilhados na tela.

#### Scenario: Evento pelo socket e pela reconciliação
- **WHEN** um evento chega pelo socket e a mesma notificação volta em `events` na reconciliação seguinte
- **THEN** apenas um toast é exibido

#### Scenario: Reconexão com evento ainda pendente
- **WHEN** a conexão cai e volta enquanto o usuário ainda não abriu a aba correspondente
- **THEN** nenhum toast novo é exibido para um evento já avisado nesta sessão

#### Scenario: Três eventos pendentes de uma vez
- **WHEN** três eventos chegam juntos
- **THEN** os toasts aparecem em sequência, um por vez
