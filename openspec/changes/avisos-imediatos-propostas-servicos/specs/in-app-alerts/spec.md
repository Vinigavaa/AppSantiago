## ADDED Requirements

### Requirement: Eventos que merecem aviso
O sistema SHALL tratar como "evento de aviso" as notificações não lidas dos tipos `PROPOSAL_ACCEPTED`, `PROPOSAL_REJECTED` e `SERVICE_UPDATED`. Demais tipos MUST alimentar apenas o indicador da aba, sem toast.

`MESSAGE_RECEIVED` MUST ficar de fora: mensagens já têm o próprio push e a própria contagem, e um toast por mensagem recebida poluiria a tela.

#### Scenario: Proposta aceita
- **WHEN** o cliente aceita a proposta de um profissional
- **THEN** a notificação `PROPOSAL_ACCEPTED` do profissional passa a ser um evento de aviso pendente

#### Scenario: Serviço cancelado pelo profissional
- **WHEN** o profissional cancela um serviço já contratado
- **THEN** a notificação `SERVICE_UPDATED` do cliente passa a ser um evento de aviso pendente

#### Scenario: Mensagem de chat não gera toast
- **WHEN** o usuário recebe uma mensagem de chat
- **THEN** nenhum toast é exibido e apenas o indicador de "Mensagens" é atualizado

### Requirement: Entrega dos eventos pendentes
`GET /notifications/badges` SHALL devolver, junto das contagens, a lista `events` com os eventos de aviso pendentes do usuário da sessão, ordenados do mais recente para o mais antigo e limitados a 5.

Cada item MUST conter `id`, `type`, `title` e `message`. Os textos MUST vir da própria notificação — o app não reescreve conteúdo por tipo.

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
O app SHALL exibir um toast para cada evento pendente que ainda não foi exibido na sessão atual, sobre a tela em que o usuário estiver, sem bloquear a interação.

O toast MUST conter o título e a mensagem da notificação e um ícone que identifique a situação. O ícone MUST vir da biblioteca de ícones já usada no app (`@expo/vector-icons`/Ionicons), no mesmo estilo e tamanho das demais telas:

| Situação | Ícone | Tom |
| --- | --- | --- |
| Proposta aceita | `checkmark-circle` | sucesso |
| Serviço cancelado / atualizado | `alert-circle` | atenção |
| Proposta não selecionada | `information-circle` | neutro |

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
O app SHALL exibir no máximo um toast por evento na mesma sessão, identificando o evento pelo `id` da notificação.

Vários eventos pendentes MUST ser exibidos em fila, um de cada vez, nunca empilhados na tela.

#### Scenario: Mesmo evento em dois ciclos de revalidação
- **WHEN** o mesmo evento continua pendente na revalidação seguinte, porque o usuário ainda não abriu a aba
- **THEN** nenhum toast novo é exibido para ele

#### Scenario: Push e poll no mesmo instante
- **WHEN** a chegada de um push e o ciclo do poll trazem o mesmo evento
- **THEN** apenas um toast é exibido

#### Scenario: Três eventos pendentes de uma vez
- **WHEN** três eventos chegam juntos
- **THEN** os toasts aparecem em sequência, um por vez

### Requirement: Aviso só para o usuário afetado
Um evento SHALL ser exibido apenas para o usuário dono da notificação.

#### Scenario: Aceite de proposta
- **WHEN** o cliente aceita a proposta do profissional A e recusa implicitamente a do profissional B
- **THEN** A recebe o aviso de proposta aceita, B recebe o aviso de proposta não selecionada, e o cliente não recebe nenhum dos dois

### Requirement: Informação continua pendente fora do app
Um evento não exibido SHALL permanecer pendente até que o usuário visualize a área correspondente.

#### Scenario: App fechado no momento do evento
- **WHEN** a proposta é aceita com o app fechado e o profissional reabre o app depois
- **THEN** o toast é exibido na volta e o indicador da aba "Serviços" está presente

#### Scenario: Visualização antes da volta ao app
- **WHEN** o usuário abre a aba correspondente e depois reabre o app
- **THEN** nenhum toast é exibido, pois a notificação já foi marcada como lida

### Requirement: Convivência com o indicador da aba
O toast SHALL ser um reforço, nunca um substituto do indicador. Exibir o aviso MUST NOT marcar a notificação como lida nem zerar a contagem da aba.

#### Scenario: Toast exibido e ignorado
- **WHEN** o profissional vê o toast de proposta aceita e não abre a aba "Serviços"
- **THEN** o indicador de "Serviços" permanece visível

#### Scenario: Aba aberta depois do toast
- **WHEN** o profissional abre a aba "Serviços"
- **THEN** o indicador desaparece e o evento deixa de estar pendente
