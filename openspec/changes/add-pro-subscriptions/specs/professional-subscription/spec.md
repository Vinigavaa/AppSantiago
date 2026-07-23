## ADDED Requirements

### Requirement: Planos de assinatura do profissional
O sistema SHALL oferecer exatamente dois planos de assinatura ao profissional — mensal e
anual — com as mesmas vantagens, diferindo apenas em duração e preço. O plano anual SHALL
ter preço promocional em relação a doze meses do plano mensal. Os planos SHALL corresponder
a produtos de assinatura auto-renovável cadastrados na Google Play e na App Store, e os
preços exibidos SHALL vir da loja (localizados e atualizados), nunca fixados no código.

#### Scenario: Profissional vê os dois planos
- **WHEN** um profissional autenticado abre a tela "Assine e apareça em destaque"
- **THEN** o app exibe o plano mensal e o plano anual com os preços obtidos da loja e a
  indicação de que o anual é mais barato que pagar mês a mês

#### Scenario: Cliente não vê assinatura
- **WHEN** um usuário com papel CLIENT tenta acessar o fluxo de assinatura
- **THEN** o sistema não oferece a compra, pois só profissionais assinam

### Requirement: Compra verificada pela loja
O sistema SHALL só considerar uma compra válida após o servidor verificá-la diretamente com
a loja (validação do recibo/token na Apple e na Google). O app SHALL enviar ao servidor o
comprovante de compra, e o servidor SHALL confirmar com a loja antes de registrar a
assinatura como ativa. O sistema MUST NOT ativar vantagens com base apenas em sinal do
dispositivo ou em afirmação do usuário.

#### Scenario: Compra confirmada pela loja
- **WHEN** o profissional confirma o pagamento na tela nativa da loja e o app envia o
  comprovante ao servidor
- **THEN** o servidor verifica o comprovante com a loja e, se válido, registra a assinatura
  como ativa com a data de expiração informada pela loja

#### Scenario: Comprovante inválido ou não confirmado
- **WHEN** o servidor recebe um comprovante que a loja não confirma como pago
- **THEN** o servidor rejeita a ativação e nenhuma vantagem é liberada

#### Scenario: App fechado no meio do pagamento
- **WHEN** o usuário fecha o app antes de o comprovante chegar ao servidor, mas a loja
  concluiu a cobrança
- **THEN** a reconciliação periódica ou o webhook da loja detecta a compra e ativa a
  assinatura sem exigir ação do usuário

### Requirement: Status de assinatura autoritativo no servidor
O servidor SHALL ser a única fonte de verdade sobre se um profissional tem assinatura ativa.
O status SHALL registrar o estado (ativa, em tolerância, expirada, cancelada), a data de
expiração e o plano. O sistema SHALL reconciliar o status com a loja periodicamente, de modo
que um cancelamento, expiração ou renovação feito fora do app seja refletido.

#### Scenario: Consulta de status
- **WHEN** o app pede o status da assinatura do profissional autenticado
- **THEN** o servidor responde com o estado atual, o plano e a data de expiração, calculados
  a partir dos dados verificados com a loja

#### Scenario: Reconciliação periódica
- **WHEN** a rotina de reconciliação executa
- **THEN** o servidor reconsulta as compras junto à loja e atualiza estados que mudaram
  (expiração, renovação, cancelamento) mesmo sem o app ter reportado

### Requirement: Renovação automática
O sistema SHALL refletir a renovação automática realizada pela loja: quando a loja cobra o
novo período, o servidor SHALL estender a data de expiração e manter as vantagens ativas.

#### Scenario: Renovação bem-sucedida
- **WHEN** a loja renova a assinatura e notifica o servidor (webhook) ou a reconciliação
  detecta a nova data
- **THEN** o servidor estende a expiração e as vantagens continuam ativas sem interrupção

### Requirement: Cancelamento pela loja
O sistema SHALL respeitar o cancelamento da renovação feito pelo profissional na própria
loja. Após o cancelamento, o profissional SHALL manter as vantagens até o fim do período já
pago e, ao expirar, SHALL voltar a ser profissional comum.

#### Scenario: Cancelou a renovação
- **WHEN** o profissional cancela a renovação pela loja e o servidor é notificado
- **THEN** o status passa a "cancelada" mas as vantagens permanecem até a data de expiração
  já paga

#### Scenario: Assinatura cancelada expira
- **WHEN** a data de expiração de uma assinatura cancelada é atingida
- **THEN** o servidor marca a assinatura como expirada e remove as vantagens

### Requirement: Período de tolerância em falha de cobrança
O sistema SHALL conceder um período curto de tolerância (grace period) quando uma cobrança
de renovação falhar, mantendo as vantagens ativas durante esse período para não punir uma
falha momentânea de pagamento. Ao fim da tolerância sem regularização, o sistema SHALL
remover as vantagens.

#### Scenario: Falha de cobrança entra em tolerância
- **WHEN** a loja informa falha na cobrança de renovação e que a assinatura entrou em grace
  period
- **THEN** o servidor marca o estado como "em tolerância" e mantém as vantagens até o fim do
  período de tolerância

#### Scenario: Tolerância expira sem pagamento
- **WHEN** o período de tolerância termina sem que a loja confirme o pagamento
- **THEN** o servidor marca a assinatura como expirada e remove as vantagens

### Requirement: Restaurar compra
O sistema SHALL oferecer uma ação "Restaurar compra" que reconhece uma assinatura já
existente do profissional em um novo aparelho ou após reinstalação, reativando as vantagens
sem nova cobrança. A restauração SHALL ser verificada com a loja pelo servidor.

#### Scenario: Restaura em novo aparelho
- **WHEN** o profissional com assinatura ativa reinstala o app e toca em "Restaurar compra"
- **THEN** o app obtém a compra da loja, o servidor a verifica e as vantagens voltam a ficar
  ativas sem cobrar novamente

#### Scenario: Nada a restaurar
- **WHEN** um profissional sem assinatura ativa toca em "Restaurar compra"
- **THEN** o sistema informa que não há assinatura a restaurar e não libera vantagens

### Requirement: Webhooks das lojas
O sistema SHALL expor endpoints para receber notificações de servidor das lojas
(Google Play Real-time Developer Notifications e App Store Server Notifications) e SHALL
autenticar/validar essas notificações antes de aplicá-las. As notificações SHALL atualizar
o status de assinatura (renovação, cancelamento, grace period, expiração, reembolso).

#### Scenario: Notificação válida da loja
- **WHEN** o servidor recebe uma notificação autêntica da loja sobre mudança de assinatura
- **THEN** o servidor valida a origem e atualiza o status correspondente

#### Scenario: Notificação inválida
- **WHEN** o servidor recebe uma requisição no endpoint de webhook que falha na validação de
  autenticidade
- **THEN** o servidor rejeita a requisição e não altera nenhum status
