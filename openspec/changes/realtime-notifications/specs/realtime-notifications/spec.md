## ADDED Requirements

### Requirement: Evento de notificação no canal realtime
O contrato `RealtimeEvent` SHALL incluir o evento `notification:new`, entregue apenas ao usuário dono da notificação.

O payload MUST ter o formato `{ "type": "notification:new", "notification": { "id": string, "type": NotificationType, "area": BadgeArea, "title": string, "message": string } }`.

O campo `area` MUST ser resolvido pelo servidor a partir do perfil do destinatário, usando o mesmo mapa que alimenta `GET /notifications/badges`. O app MUST NOT recalcular a área nem reescrever `title`/`message` por tipo — toast, central e push contam a mesma história.

O contrato no app (`src/features/realtime/types.ts`) MUST espelhar exatamente o do servidor (`apps/api/src/modules/realtime/types.ts`).

#### Scenario: Cliente recebe uma proposta
- **WHEN** um profissional envia uma proposta e o cliente está com o app aberto e conectado
- **THEN** o cliente recebe `notification:new` com `type` `PROPOSAL_RECEIVED` e `area` `proposals`

#### Scenario: Mesma notificação, área por perfil
- **WHEN** um profissional recebe `PROPOSAL_ACCEPTED`
- **THEN** o evento chega com `area` `services`, e não `proposals`

#### Scenario: Evento não vaza para terceiros
- **WHEN** o cliente aceita a proposta do profissional A e recusa implicitamente a do profissional B
- **THEN** A recebe apenas o seu evento, B apenas o dele, e o cliente não recebe nenhum dos dois

### Requirement: Ponto único de fan-out
O backend SHALL concentrar a emissão de notificações em uma única função `notify()`, usada por todos os fluxos que notificam alguém.

A ordem MUST ser: persistir a notificação, publicar `notification:new` no WebSocket e enviar o push.

A função inteira MUST ser chamada depois do commit da operação que originou o evento — nunca de dentro da transação. Uma operação revertida portanto não persiste, não publica e não envia push, porque nem chega a alcançar a emissão.

Fluxos que já publicam um evento próprio do mesmo fato (o chat, com `message:new`) MUST poder desligar a publicação, mantendo a persistência e o push. Sem isso o mesmo fato viraria dois avisos na tela.

Falha na publicação ou no push MUST NOT derrubar a operação de origem nem impedir a persistência.

#### Scenario: Transação revertida
- **WHEN** a transação da operação de origem falha e sofre rollback
- **THEN** a emissão não é alcançada: nada é persistido, nenhum evento é publicado e nenhum push é enviado

#### Scenario: Fluxo com evento próprio
- **WHEN** o chat emite a notificação de mensagem recebida
- **THEN** a notificação é persistida e o push é enviado, mas nenhum `notification:new` é publicado — o aviso vem do `message:new`

#### Scenario: Falha ao publicar no socket
- **WHEN** a entrega pelo socket falha para uma das conexões do usuário
- **THEN** a operação de origem responde normalmente, a notificação permanece persistida e a falha é registrada em log

#### Scenario: Falha no push
- **WHEN** o envio do push falha
- **THEN** a notificação permanece persistida e o evento já entregue pelo socket não é afetado

### Requirement: Usuário sem conexão aberta
Um evento publicado para um usuário sem conexão SHALL ser simplesmente descartado pelo canal, sem fila nem reenvio.

A notificação persistida MUST continuar sendo a fonte da verdade: ao conectar, o usuário recupera o estado pela reconciliação, e o push cobre o app fechado.

#### Scenario: App fechado no momento do evento
- **WHEN** a proposta é aceita com o app do profissional fechado
- **THEN** nenhum evento é entregue pelo socket, o push é enviado e, ao reabrir o app, o badge e o aviso aparecem pela reconciliação

#### Scenario: Duas conexões do mesmo usuário
- **WHEN** o usuário está com o app e a web abertos ao mesmo tempo
- **THEN** o evento é entregue às duas conexões

### Requirement: Reconciliação por conexão
O app SHALL recarregar o estado de notificações uma vez a cada conexão estabelecida, incluindo reconexões e a volta do segundo plano, e MUST NOT recarregá-lo em intervalo de tempo.

#### Scenario: Reconexão após queda
- **WHEN** a conexão cai e o cliente reconecta pelo backoff já existente
- **THEN** o estado de badges é recarregado uma vez e os eventos perdidos durante a queda aparecem

#### Scenario: Volta do segundo plano
- **WHEN** o usuário retorna ao app depois de deixá-lo em segundo plano
- **THEN** a conexão é restabelecida e o estado é recarregado uma vez

#### Scenario: Conexão estável
- **WHEN** a conexão permanece aberta por vários minutos sem eventos
- **THEN** nenhuma requisição de revalidação é feita

### Requirement: Compatibilidade com versões já instaladas
`GET /notifications/badges` SHALL continuar disponível e com o mesmo contrato, incluindo o campo `events`.

Uma versão do app anterior a esta mudança MUST continuar funcionando pelo poll, sem erro e sem perda de funcionalidade.

#### Scenario: APK antigo em uso
- **WHEN** um dispositivo com a versão anterior do app chama `GET /notifications/badges`
- **THEN** a resposta mantém `badges` e `events` no formato atual

### Requirement: Limite de escala assumido
O registro de conexões SHALL permanecer em memória do processo, suportando uma única instância da API.

A substituição futura por pub/sub externo MUST ficar contida em `apps/api/src/modules/realtime/registry.ts`: nenhum handler de domínio pode depender de como o evento é distribuído.

#### Scenario: Handler não conhece o transporte
- **WHEN** um novo fluxo precisa notificar um usuário
- **THEN** ele chama `notify()` e não referencia o registro de conexões nem o formato do socket

### Requirement: Aviso de exclusão de solicitação
Ao excluir uma solicitação, o sistema SHALL notificar os profissionais que tinham proposta pendente nela.

A notificação MUST ser emitida antes da exclusão dos dados, para que os destinatários ainda sejam conhecidos, e MUST usar o mesmo fan-out dos demais fluxos.

#### Scenario: Solicitação com propostas pendentes
- **WHEN** o cliente exclui uma solicitação que tinha 3 propostas pendentes
- **THEN** os 3 profissionais recebem badge e toast informando que a solicitação foi excluída

#### Scenario: Solicitação sem propostas
- **WHEN** o cliente exclui uma solicitação sem nenhuma proposta
- **THEN** nenhuma notificação é emitida e a exclusão ocorre normalmente

#### Scenario: Exclusão bloqueada
- **WHEN** a exclusão é recusada porque a solicitação está contratada
- **THEN** nenhuma notificação é emitida
