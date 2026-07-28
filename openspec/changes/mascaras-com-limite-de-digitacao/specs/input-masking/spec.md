## ADDED Requirements

### Requirement: Máscara e limite aplicados na digitação
Todo campo com formato conhecido ou tamanho máximo definido SHALL formatar e truncar
o valor no momento da digitação, antes de o estado ser atualizado. O app MUST NOT
aceitar caracteres além do limite do campo para depois exibir erro.

#### Scenario: Caractere excedente é descartado na digitação
- **WHEN** o usuário digita um caractere em um campo que já atingiu seu limite
- **THEN** o valor exibido permanece inalterado e nenhum erro é exibido

#### Scenario: Texto colado maior que o limite é truncado
- **WHEN** o usuário cola um texto maior que o limite do campo
- **THEN** apenas a quantidade máxima permitida é mantida e o restante é descartado silenciosamente

#### Scenario: Caractere inválido para o formato é ignorado
- **WHEN** o usuário digita uma letra em um campo numérico mascarado (CEP, telefone, valor)
- **THEN** o caractere é descartado e o valor exibido não muda

### Requirement: Máscara de CEP
O campo de CEP SHALL exibir o valor no formato `00000-000` enquanto o usuário digita
e MUST aceitar no máximo 8 dígitos.

#### Scenario: Hífen inserido automaticamente
- **WHEN** o usuário digita o sexto dígito do CEP
- **THEN** o campo exibe o hífen automaticamente antes dele (ex.: `01310-1`)

#### Scenario: CEP completo bloqueia novos caracteres
- **WHEN** o campo exibe `01310-100` e o usuário digita mais um dígito
- **THEN** o valor permanece `01310-100`

#### Scenario: CEP parcial permanece editável
- **WHEN** o campo exibe `01310` e o usuário apaga um caractere
- **THEN** o valor passa a `0131` sem hífen residual

### Requirement: Máscara de telefone brasileiro
O campo de telefone SHALL formatar o valor conforme a quantidade de dígitos digitados,
usando `(00) 0000-0000` para até 10 dígitos e `(00) 00000-0000` a partir de 11 dígitos,
e MUST aceitar no máximo 11 dígitos.

#### Scenario: Telefone fixo formatado
- **WHEN** o usuário digita `4833334444`
- **THEN** o campo exibe `(48) 3333-4444`

#### Scenario: Celular formatado
- **WHEN** o usuário digita `48999998888`
- **THEN** o campo exibe `(48) 99999-8888`

#### Scenario: Décimo primeiro dígito é o último aceito
- **WHEN** o campo exibe `(48) 99999-8888` e o usuário digita mais um dígito
- **THEN** o valor permanece `(48) 99999-8888`

#### Scenario: Transição de fixo para celular
- **WHEN** o campo exibe `(48) 3333-4444` e o usuário digita mais um dígito `5`
- **THEN** o campo passa a exibir `(48) 33334-4445`

### Requirement: Máscara de valor monetário
O campo de valor da proposta SHALL aceitar apenas dígitos e no máximo um separador
decimal, limitando a 2 casas decimais e a 7 dígitos na parte inteira.

#### Scenario: Segundo separador decimal é ignorado
- **WHEN** o campo exibe `500,5` e o usuário digita outra vírgula
- **THEN** o valor permanece `500,5`

#### Scenario: Terceira casa decimal é descartada
- **WHEN** o campo exibe `500,50` e o usuário digita `9`
- **THEN** o valor permanece `500,50`

#### Scenario: Parte inteira limitada
- **WHEN** o usuário digita mais de 7 dígitos antes do separador
- **THEN** apenas os 7 primeiros dígitos são mantidos

### Requirement: Consistência entre telas
Campos que representam o mesmo dado SHALL usar a mesma máscara e o mesmo limite em
todas as telas do app.

#### Scenario: Telefone do cliente e do profissional
- **WHEN** o telefone é editado no perfil do cliente ou no perfil do profissional
- **THEN** ambos aplicam a mesma máscara e o mesmo limite de 11 dígitos

### Requirement: Envio ao backend permanece compatível
O valor enviado à API SHALL continuar dentro do formato já aceito pelo backend; a
máscara MUST NOT introduzir um payload que a validação atual do servidor rejeite.

#### Scenario: CEP mascarado é aceito pela API
- **WHEN** o formulário de solicitação é enviado com o CEP mascarado `01310-100`
- **THEN** a validação do backend (`/^\d{5}-?\d{3}$/`) aceita o valor

#### Scenario: Telefone mascarado respeita o limite do backend
- **WHEN** o telefone mascarado `(48) 99999-8888` é enviado
- **THEN** o valor tem no máximo 20 caracteres e é aceito pela API
