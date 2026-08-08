## ADDED Requirements

### Requirement: Ciclo de vida da denúncia
Toda denúncia MUST ter um status entre `PENDING`, `RESOLVED` e `DISMISSED`. Uma
denúncia nasce `PENDING`. Ao ser resolvida ou descartada, MUST registrar a data da
decisão e uma nota curta do operador.

#### Scenario: Denúncia resolvida
- **WHEN** o operador resolve uma denúncia pendente com uma nota
- **THEN** o status passa a `RESOLVED`, a data da decisão e a nota ficam gravadas

#### Scenario: Denúncia descartada
- **WHEN** o operador descarta uma denúncia pendente
- **THEN** o status passa a `DISMISSED` e a denúncia sai da lista de pendentes

#### Scenario: Decisão sobre denúncia já decidida
- **WHEN** o operador tenta decidir uma denúncia que não está `PENDING`
- **THEN** a ferramenta recusa a operação e informa o status atual

### Requirement: Ferramenta de moderação
O projeto SHALL oferecer uma ferramenta de linha de comando para operar a moderação
sem alteração manual no banco. A ferramenta MUST permitir: listar denúncias pendentes
por ordem de chegada, exibir o conteúdo denunciado e o contexto do alvo, ocultar o
conteúdo, suspender e reativar um usuário, e resolver ou descartar a denúncia.

#### Scenario: Listar pendentes
- **WHEN** o operador lista as denúncias
- **THEN** a ferramenta mostra as pendentes com id, alvo, motivo, denunciante e há quanto tempo aguardam

#### Scenario: Inspecionar um caso
- **WHEN** o operador pede o detalhe de uma denúncia
- **THEN** a ferramenta mostra o conteúdo denunciado, o autor do conteúdo e o detalhe informado pelo denunciante

#### Scenario: Ferramenta sem banco configurado
- **WHEN** a ferramenta roda sem `DATABASE_URL` disponível
- **THEN** ela encerra com mensagem explicando a variável ausente, sem stack trace cru

### Requirement: Ocultação de conteúdo
Mensagens, avaliações, solicitações de serviço e itens de portfólio SHALL poder ser
ocultados por moderação, com registro da data e do motivo. Conteúdo ocultado MUST
deixar de aparecer em qualquer leitura da API para qualquer usuário, inclusive o autor,
e MUST ser preservado no banco para fins de auditoria.

#### Scenario: Mensagem ocultada some da conversa
- **WHEN** uma mensagem é ocultada por moderação
- **THEN** ela não aparece mais na listagem de mensagens de nenhum dos participantes

#### Scenario: Avaliação ocultada não conta
- **WHEN** uma avaliação é ocultada por moderação
- **THEN** ela some da lista de avaliações e deixa de influenciar a nota média exibida

#### Scenario: Solicitação ocultada some das oportunidades
- **WHEN** uma solicitação de serviço é ocultada por moderação
- **THEN** ela não aparece na lista de oportunidades nem no detalhe, e o cliente vê que ela foi removida por moderação

#### Scenario: Item de portfólio ocultado
- **WHEN** um item de portfólio é ocultado por moderação
- **THEN** ele não aparece no perfil público nem no perfil do próprio profissional

### Requirement: Suspensão de usuário
Um usuário SHALL poder ser suspenso por moderação, com registro da data e do motivo.
Enquanto suspenso, toda rota autenticada do aplicativo MUST responder 403 com código
`ACCOUNT_SUSPENDED` e o motivo, e o conteúdo desse usuário MUST deixar de aparecer nas
listagens públicas. A suspensão MUST poder ser desfeita.

#### Scenario: Usuário suspenso tenta usar o app
- **WHEN** um usuário suspenso faz qualquer requisição autenticada
- **THEN** o backend responde 403 com código `ACCOUNT_SUSPENDED` e o motivo da suspensão

#### Scenario: App reage à suspensão
- **WHEN** o app recebe `ACCOUNT_SUSPENDED` em qualquer requisição
- **THEN** exibe a tela informando a suspensão e o motivo, e encerra a sessão local

#### Scenario: Conteúdo de suspenso some das listagens
- **WHEN** um profissional é suspenso
- **THEN** ele deixa de aparecer na busca de profissionais e seu perfil público fica indisponível

#### Scenario: Reativação
- **WHEN** o operador reativa um usuário suspenso
- **THEN** o acesso volta ao normal e o conteúdo não ocultado individualmente volta a aparecer

### Requirement: Prazo de análise
A moderação SHALL analisar e decidir toda denúncia em até 24 horas a partir do
registro. A ferramenta de moderação MUST sinalizar as denúncias pendentes que já
ultrapassaram esse prazo.

#### Scenario: Denúncia perto do prazo
- **WHEN** o operador lista as pendentes e existe denúncia com mais de 24 horas
- **THEN** a ferramenta destaca essas denúncias como atrasadas no topo da lista

### Requirement: Compromisso público de conduta
Os Termos de Uso SHALL declarar a tolerância zero a conteúdo ofensivo e a usuários
abusivos, descrever como denunciar, informar o prazo de análise de até 24 horas e as
consequências possíveis, e publicar o contato de suporte.

#### Scenario: Termos consultados na loja e no app
- **WHEN** um usuário ou revisor abre os Termos de Uso
- **THEN** encontra a política de conteúdo, o fluxo de denúncia, o prazo de 24 horas e o e-mail de contato
