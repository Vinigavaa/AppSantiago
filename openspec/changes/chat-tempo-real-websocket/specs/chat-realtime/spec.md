## ADDED Requirements

### Requirement: Conexão WebSocket autenticada
O sistema SHALL expor um endpoint WebSocket em `GET /ws`. O handshake MUST ser autenticado por um ticket de uso único obtido pelo endpoint autenticado `POST /realtime/ticket`.

O ticket MUST:

- ser vinculado ao `userId` da sessão que o solicitou;
- expirar em no máximo 60 segundos;
- ser invalidado no primeiro uso, de modo que uma segunda tentativa com o mesmo ticket falhe.

A conexão MUST ser recusada quando o ticket estiver ausente, for desconhecido, já tiver sido usado ou estiver expirado. Nenhum evento SHALL ser entregue antes da autenticação do handshake.

#### Scenario: Handshake com ticket válido
- **WHEN** o app solicita um ticket com sessão válida e conecta em `/ws` apresentando esse ticket
- **THEN** a conexão é aceita e passa a ser identificada pelo `userId` do dono do ticket

#### Scenario: Handshake sem ticket
- **WHEN** uma conexão chega em `/ws` sem ticket
- **THEN** a conexão é recusada e encerrada, sem entregar nenhum evento

#### Scenario: Ticket reutilizado
- **WHEN** um ticket já usado em um handshake é apresentado numa segunda conexão
- **THEN** a segunda conexão é recusada

#### Scenario: Ticket expirado
- **WHEN** um ticket é apresentado depois do seu prazo de validade
- **THEN** a conexão é recusada

#### Scenario: Ticket solicitado sem sessão
- **WHEN** `POST /realtime/ticket` é chamado sem sessão válida
- **THEN** a resposta é `401` e nenhum ticket é emitido

### Requirement: Entrega direcionada de eventos
O servidor SHALL manter o vínculo entre usuários autenticados e suas conexões abertas, e MUST entregar cada evento apenas às conexões do usuário destinatário daquele evento.

Um evento de uma conversa MUST ser entregue somente a participantes daquela conversa. Um usuário sem conexão aberta simplesmente não recebe o evento — o estado permanece no banco e é recuperado na próxima carga.

#### Scenario: Evento chega apenas ao destinatário
- **WHEN** o servidor publica um evento de chat para o usuário B
- **THEN** apenas as conexões abertas do usuário B recebem esse evento, e nenhuma conexão de outro usuário o recebe

#### Scenario: Destinatário desconectado
- **WHEN** o servidor publica um evento para um usuário sem nenhuma conexão aberta
- **THEN** o evento é descartado sem erro, e a operação que o originou permanece concluída com sucesso

#### Scenario: Mesmo usuário em duas conexões
- **WHEN** o mesmo usuário está com duas conexões abertas e um evento é publicado para ele
- **THEN** as duas conexões recebem o evento

### Requirement: Evento de mensagem nova
Ao criar uma mensagem com sucesso, o servidor SHALL publicar um evento `message:new` para o destinatário, identificado como o participante da conversa que não é o remetente.

O evento MUST conter o identificador da conversa e a mensagem no mesmo formato serializado devolvido pela API REST, na perspectiva de quem recebe (`mine = false`), de modo que o app possa exibi-la sem nenhuma consulta adicional.

A publicação MUST ocorrer somente depois de a mensagem estar gravada, e MUST ser complementar: falha na publicação não pode alterar a resposta HTTP do envio nem impedir a gravação.

#### Scenario: Usuário A envia, usuário B recebe
- **WHEN** o usuário A envia uma mensagem numa conversa em que o usuário B é o outro participante, e B está conectado
- **THEN** B recebe um evento `message:new` com o identificador da conversa e a mensagem completa

#### Scenario: Mensagem aparece sem nova consulta
- **WHEN** o app do usuário B recebe um evento `message:new` da conversa aberta na tela
- **THEN** a mensagem é exibida imediatamente na conversa, sem nenhuma requisição adicional e sem o usuário atualizar a tela

#### Scenario: Remetente não recebe o próprio evento
- **WHEN** o usuário A envia uma mensagem
- **THEN** o evento `message:new` não é entregue às conexões de A, cuja tela já exibe a mensagem pelo envio otimista

#### Scenario: Falha na publicação não derruba o envio
- **WHEN** a publicação do evento falha por qualquer motivo
- **THEN** a mensagem permanece gravada e a resposta do envio continua `201` com a mensagem serializada

#### Scenario: Mensagem com anexo
- **WHEN** a mensagem enviada contém um anexo de imagem
- **THEN** o evento entregue contém a URL definitiva do anexo, igual à devolvida pela API REST

### Requirement: Evento de leitura
Ao marcar mensagens recebidas como lidas, o servidor SHALL publicar um evento `message:read` para o remetente daquelas mensagens, contendo o identificador da conversa e os identificadores das mensagens afetadas.

O evento MUST ser publicado apenas quando ao menos uma mensagem mudou de estado.

#### Scenario: Recibo de leitura em tempo real
- **WHEN** o usuário B abre uma conversa com mensagens não lidas do usuário A, e A está conectado com a conversa aberta
- **THEN** A recebe um evento `message:read` e o indicador de leitura das suas mensagens é atualizado sem nova consulta

#### Scenario: Abertura sem mensagens novas
- **WHEN** o usuário B abre uma conversa em que nenhuma mensagem recebida estava por ler
- **THEN** nenhum evento `message:read` é publicado

#### Scenario: Mensagem recebida com a conversa já aberta
- **WHEN** o usuário B está com a conversa aberta na tela e recebe uma mensagem por `message:new`
- **THEN** a mensagem é marcada como lida sem baixar o histórico, e o usuário A recebe o `message:read` correspondente

### Requirement: Marcação de leitura sem histórico
O sistema SHALL expor `POST /chats/:id/read`, autenticado, que marca como lidas as mensagens recebidas da conversa e devolve quantas mudaram de estado.

O endpoint MUST aplicar as mesmas regras de participação e bloqueio do histórico, e MUST publicar `message:read` sob as mesmas condições — apenas quando ao menos uma mensagem mudou de estado.

Ele existe porque, sem consulta periódica, uma mensagem que chega com a conversa já aberta não teria nada que a marcasse como lida; reaproveitar o histórico para isso traria todas as mensagens a cada recebimento.

#### Scenario: Marcação bem-sucedida
- **WHEN** a conversa tem 1 mensagem recebida não lida e o endpoint é chamado
- **THEN** a resposta é `200` com `{ "read": 1 }` e o remetente recebe `message:read`

#### Scenario: Nada a marcar
- **WHEN** o endpoint é chamado numa conversa sem mensagens recebidas por ler
- **THEN** a resposta é `200` com `{ "read": 0 }` e nenhum evento é publicado

#### Scenario: Conversa de outro usuário
- **WHEN** o endpoint é chamado para uma conversa da qual o usuário não participa
- **THEN** a resposta é `404` e nada é marcado

### Requirement: Evento de exclusão
Ao excluir com sucesso uma mensagem ainda não lida, o servidor SHALL publicar um evento `message:deleted` para o outro participante da conversa, contendo o identificador da conversa e o da mensagem removida.

#### Scenario: Mensagem some para o destinatário
- **WHEN** o usuário A exclui uma mensagem ainda não lida e o usuário B está conectado
- **THEN** B recebe `message:deleted` e a mensagem desaparece da conversa dele imediatamente

#### Scenario: Exclusão recusada não publica evento
- **WHEN** a exclusão é recusada porque a mensagem já foi lida
- **THEN** nenhum evento `message:deleted` é publicado

### Requirement: Conexão única e reutilizada no aplicativo
O aplicativo SHALL manter no máximo uma conexão WebSocket por sessão, compartilhada por todas as telas que precisam de eventos.

O aplicativo MUST:

- abrir a conexão quando existir ao menos uma tela interessada em eventos e houver sessão válida;
- reutilizar a conexão existente quando outra tela passar a se interessar, sem abrir uma segunda;
- registrar e remover os ouvintes de cada tela de forma pareada, sem acumular ouvintes duplicados entre montagens;
- encerrar a conexão quando não restar nenhum interessado e ao encerrar a sessão.

#### Scenario: Duas telas, uma conexão
- **WHEN** a lista de conversas e uma conversa aberta estão ambas assinando eventos
- **THEN** existe exatamente uma conexão WebSocket aberta

#### Scenario: Remontagem não duplica ouvintes
- **WHEN** uma tela é montada, desmontada e montada novamente
- **THEN** cada evento recebido é processado uma única vez por essa tela

#### Scenario: Encerramento ao sair
- **WHEN** a última tela interessada é desmontada ou o usuário encerra a sessão
- **THEN** a conexão é fechada e nenhum ouvinte permanece registrado

#### Scenario: Sessão encerrada
- **WHEN** o usuário faz logout
- **THEN** a conexão é encerrada e não é reaberta enquanto não houver nova sessão

### Requirement: Reconexão automática e reconciliação
O aplicativo SHALL reconectar automaticamente quando a conexão cair, usando espera crescente entre as tentativas para não martelar o servidor, e MUST tratar a indisponibilidade temporária do servidor como um caso normal de reconexão.

A conexão MUST ter um mecanismo de heartbeat que detecte conexões silenciosamente mortas e as trate como queda.

Ao estabelecer ou restabelecer a conexão, o aplicativo MUST fazer **uma** carga do estado atual das telas ativas, para recuperar o que aconteceu enquanto estava desconectado. Essa carga MUST acontecer por evento de conexão, nunca em intervalo periódico.

#### Scenario: Queda de conexão
- **WHEN** a conexão é interrompida
- **THEN** o aplicativo tenta reconectar automaticamente, com espera crescente entre as tentativas

#### Scenario: Servidor indisponível
- **WHEN** o servidor está indisponível ou iniciando e a conexão é recusada
- **THEN** o aplicativo continua tentando com espera crescente, sem exibir erro bloqueante ao usuário

#### Scenario: Conexão morta detectada
- **WHEN** a conexão para de responder ao heartbeat dentro do prazo esperado
- **THEN** ela é considerada caída e o fluxo de reconexão é iniciado

#### Scenario: Mensagens perdidas durante a queda
- **WHEN** a conexão é restabelecida depois de uma queda em que chegaram mensagens novas
- **THEN** a conversa aberta é reconciliada uma única vez e passa a exibir as mensagens que chegaram durante a queda

#### Scenario: Reconciliação não vira polling
- **WHEN** a conexão está estabelecida e estável
- **THEN** nenhuma carga adicional de mensagens ou de conversas é disparada por tempo

### Requirement: Lista de conversas atualizada por evento
A lista de conversas SHALL refletir mensagens novas, leituras e exclusões a partir dos eventos recebidos, sem consultar o servidor periodicamente.

Ao receber `message:new`, a lista MUST atualizar a prévia da conversa correspondente, sua posição na ordenação e a contagem de não lidas. Se o evento pertencer a uma conversa que ainda não está na lista, o aplicativo MUST carregar a lista uma vez para incorporá-la.

#### Scenario: Prévia e contagem atualizam sozinhas
- **WHEN** o usuário está na lista de conversas e chega uma mensagem nova de uma conversa já listada
- **THEN** a prévia, a contagem de não lidas e a ordenação são atualizadas imediatamente, sem nova requisição

#### Scenario: Primeira mensagem de uma conversa nova
- **WHEN** chega uma mensagem de uma conversa que ainda não aparecia na lista
- **THEN** o aplicativo carrega a lista uma única vez e a conversa passa a aparecer

#### Scenario: Contagem zera ao abrir
- **WHEN** o usuário abre uma conversa com mensagens não lidas
- **THEN** a contagem de não lidas daquela conversa é zerada na lista

### Requirement: Ausência de polling no chat
O aplicativo SHALL NOT realizar requisições periódicas para descobrir alterações no chat. Não SHALL existir intervalo recorrente consultando mensagens de uma conversa nem a lista de conversas.

Requisições ao servidor no fluxo de chat MUST ser disparadas apenas por: abertura de tela, ação do usuário (enviar, excluir, puxar para atualizar) ou estabelecimento/restabelecimento da conexão.

#### Scenario: Conversa aberta e ociosa
- **WHEN** uma conversa permanece aberta por vários minutos sem nenhuma mensagem nova e sem ação do usuário
- **THEN** nenhuma requisição ao servidor é disparada nesse período

#### Scenario: Lista de conversas aberta e ociosa
- **WHEN** a lista de conversas permanece aberta sem eventos e sem ação do usuário
- **THEN** nenhuma requisição ao servidor é disparada nesse período

### Requirement: Compatibilidade com o aplicativo já instalado
Os endpoints REST do chat SHALL permanecer com o mesmo caminho, o mesmo formato de requisição e o mesmo formato de resposta.

Nenhum comportamento existente MUST ser condicionado à existência de uma conexão WebSocket: a versão já distribuída do aplicativo, que consulta periodicamente, MUST continuar funcionando sem alteração.

#### Scenario: APK antiga continua funcionando
- **WHEN** uma versão do aplicativo que não conhece o WebSocket consulta `GET /chats` e `GET /chats/:id/messages` periodicamente
- **THEN** as respostas permanecem idênticas às atuais e o chat continua funcionando por essas consultas

#### Scenario: Envio funciona sem conexão de eventos
- **WHEN** uma mensagem é enviada por `POST /chats/:id/messages` sem que o remetente tenha conexão WebSocket aberta
- **THEN** a mensagem é gravada e a resposta é `201`, e o destinatário conectado ainda recebe o evento

### Requirement: Autorização preservada no canal de eventos
As regras de acesso do chat SHALL valer igualmente para os eventos. Um usuário MUST NOT receber evento de conversa da qual não participa, e conversas bloqueadas MUST NOT gerar entrega de eventos.

#### Scenario: Não participante não recebe
- **WHEN** um usuário conectado não participa de uma conversa em que uma mensagem foi criada
- **THEN** ele não recebe nenhum evento dessa conversa

#### Scenario: Bloqueio impede entrega
- **WHEN** existe bloqueio entre os dois participantes de uma conversa
- **THEN** nenhum evento dessa conversa é entregue entre eles

#### Scenario: Conexão não confia no cliente
- **WHEN** uma mensagem recebida pela conexão declara um `userId` ou uma conversa diferente do vínculo estabelecido no handshake
- **THEN** ela é ignorada, e a identidade usada permanece a autenticada no handshake
