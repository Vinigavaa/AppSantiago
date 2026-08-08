## ADDED Requirements

### Requirement: Páginas legais públicas e sem autenticação

A API SHALL servir os Termos de Uso em `GET /termos` e a Política de Privacidade em
`GET /privacidade`, como HTML, sem exigir autenticação, sessão, cookie ou qualquer
cabeçalho especial. As páginas MUST responder `200` com `Content-Type: text/html`.

#### Scenario: Acesso anônimo aos Termos

- **WHEN** um cliente HTTP sem cookies e sem `Authorization` faz `GET /termos`
- **THEN** a resposta é `200` com `Content-Type` iniciando em `text/html`
- **AND** o corpo contém o título "Termos de Uso"

#### Scenario: Acesso anônimo à Política

- **WHEN** um cliente HTTP sem cookies e sem `Authorization` faz `GET /privacidade`
- **THEN** a resposta é `200` com `Content-Type` iniciando em `text/html`
- **AND** o corpo contém o título "Política de Privacidade"

#### Scenario: Rotas legais não caem no notFound JSON

- **WHEN** `GET /termos` ou `GET /privacidade` é chamado
- **THEN** a resposta NÃO é o corpo JSON `{"code":"NOT_FOUND"}` do handler global

### Requirement: Índice legal como URL única para as lojas

A API SHALL servir `GET /legal` como página índice contendo links para `/termos` e
`/privacidade`. Essa é a URL estável a ser cadastrada nas fichas das lojas.

#### Scenario: Índice lista os dois documentos

- **WHEN** um cliente faz `GET /legal`
- **THEN** a resposta é `200` em HTML
- **AND** o corpo contém um link para `/termos` e um link para `/privacidade`

### Requirement: Links da tela de assinatura funcionam sem novo build

As URLs padrão usadas pelo app quando `EXPO_PUBLIC_TERMS_URL` e
`EXPO_PUBLIC_PRIVACY_URL` não estão definidas SHALL continuar sendo
`https://appsantiago.onrender.com/termos` e
`https://appsantiago.onrender.com/privacidade`. A mudança MUST NOT exigir novo build
do app para que os links da tela de assinatura passem a abrir conteúdo válido.

#### Scenario: Build já publicado abre os termos

- **WHEN** um usuário em um build existente toca em "Termos de Uso" na tela de
  assinatura
- **THEN** o navegador abre a página de Termos com conteúdo legível
- **AND** nenhuma variável de ambiente do app precisou ser alterada

### Requirement: Conteúdo mínimo dos Termos de Uso

A página de Termos SHALL descrever, em português do Brasil: a natureza do serviço
como marketplace que apenas conecta clientes e profissionais; que o contrato do
serviço é entre cliente e profissional, não com a plataforma; as condições da
assinatura recorrente do profissional, incluindo renovação automática, cobrança
pela loja (Apple ou Google) e cancelamento pela própria loja; as regras de conduta e
as hipóteses de suspensão de conta; a limitação de responsabilidade da plataforma; e
a data da última atualização.

#### Scenario: Termos cobrem a assinatura recorrente

- **WHEN** um revisor de loja lê a página de Termos
- **THEN** encontra que a assinatura renova automaticamente até ser cancelada
- **AND** encontra que a cobrança e o cancelamento ocorrem na loja do dispositivo

#### Scenario: Termos deixam claro o papel da plataforma

- **WHEN** um usuário lê a página de Termos
- **THEN** encontra que a plataforma não executa os serviços contratados
- **AND** encontra que a relação contratual do serviço é entre cliente e profissional

#### Scenario: Data de atualização visível

- **WHEN** a página de Termos é carregada
- **THEN** exibe a data da última atualização do documento

### Requirement: Conteúdo mínimo da Política de Privacidade

A página de Política SHALL descrever, em português do Brasil: a identificação do
controlador (nome e email de contato); os dados pessoais coletados; a finalidade e a
base legal de cada uso; o compartilhamento com operadores terceiros; os direitos do
titular previstos na LGPD e como exercê-los; o prazo de retenção; e a data da última
atualização.

Os dados listados MUST corresponder aos efetivamente coletados pelo sistema: nome,
email, telefone, foto de perfil, CPF/CNPJ quando informado, endereço do pedido de
serviço, fotos anexadas a pedidos, mensagens e anexos do chat, avaliações, token de
push do dispositivo, e IP e user-agent da sessão.

#### Scenario: Política identifica o controlador

- **WHEN** um usuário lê a Política
- **THEN** encontra o nome do controlador e um email de contato para exercer direitos

#### Scenario: Política lista terceiros que processam dados

- **WHEN** um usuário lê a seção de compartilhamento
- **THEN** encontra os operadores usados: hospedagem, banco de dados, envio de email,
  armazenamento de imagens, notificações push e processamento de assinaturas pelas
  lojas

#### Scenario: Política cobre exclusão de conta

- **WHEN** um usuário procura como excluir seus dados
- **THEN** encontra o canal de contato e o prazo de resposta

#### Scenario: Política não promete o que o sistema não faz

- **WHEN** a Política é revisada contra o schema do banco
- **THEN** nenhum dado listado como coletado deixa de existir no sistema
- **AND** nenhum dado pessoal armazenado pelo sistema fica ausente da lista

### Requirement: Legibilidade em dispositivo móvel

As páginas SHALL ser legíveis em tela de celular sem zoom: viewport responsivo,
largura de leitura limitada, e rolagem vertical apenas. As páginas MUST NOT depender
de recursos externos (CDN, fontes remotas, scripts de terceiros).

#### Scenario: Abertura em WebView de celular

- **WHEN** a página é aberta em uma viewport de 375px de largura
- **THEN** o texto é legível sem zoom horizontal
- **AND** a página não rola horizontalmente

#### Scenario: Sem dependências externas

- **WHEN** o HTML servido é inspecionado
- **THEN** não há referência a script, folha de estilo, fonte ou imagem de outro host

### Requirement: Identificação do controlador em ponto único

O nome e o email de contato do controlador SHALL viver em um único ponto de
configuração no código, reutilizado por ambas as páginas. Alterar o contato MUST NOT
exigir edição do texto dos documentos.

#### Scenario: Trocar o email de contato

- **WHEN** o email de contato do controlador é alterado no ponto de configuração
- **THEN** as duas páginas passam a exibir o novo email
- **AND** nenhum outro arquivo precisou ser editado
