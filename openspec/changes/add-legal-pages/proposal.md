## Why

A tela de assinatura já linka `https://appsantiago.onrender.com/termos` e
`https://appsantiago.onrender.com/privacidade`, mas as duas rotas não existem: a API
responde `404 {"code":"NOT_FOUND"}` pelo `notFound` global. Hoje o usuário que toca
nos links antes de assinar recebe um JSON de erro.

Isso bloqueia a publicação nas duas lojas: a Google Play exige a URL da Política de
Privacidade na ficha do app, e a Apple exige Termos de Uso e Política de Privacidade
acessíveis na própria tela de compra de assinatura recorrente. Sem as páginas no ar,
a submissão é reprovada.

## What Changes

- Adicionar as rotas públicas `GET /termos` e `GET /privacidade` na API, servindo
  HTML legível e responsivo, sem autenticação.
- Redigir os textos em pt-BR, descrevendo o que o app realmente faz: marketplace que
  conecta clientes e profissionais, assinatura recorrente cobrada pelas lojas, e os
  dados pessoais efetivamente coletados (nome, email, telefone, foto, CPF/CNPJ
  opcional, endereço do pedido, mensagens do chat, avaliações, token de push,
  IP e user-agent da sessão).
- Identificar o controlador como pessoa física, com nome e email de contato em um
  único ponto de configuração no código.
- Adicionar `GET /legal` como índice simples com link para as duas páginas — é a URL
  única e estável para colar na ficha da Play Store e no App Store Connect.
- Manter as URLs padrão de `EXPO_PUBLIC_TERMS_URL` e `EXPO_PUBLIC_PRIVACY_URL`
  inalteradas: nenhum novo build do app é necessário.

Não é escopo: aceite de termos no cadastro, versionamento com re-aceite, ou
armazenamento de consentimento no banco. As lojas não exigem isso e o app ainda não
tem o volume que justificaria.

## Capabilities

### New Capabilities
- `legal-pages`: páginas públicas de Termos de Uso e Política de Privacidade
  servidas pela API, com conteúdo, disponibilidade e formato exigidos pela Apple,
  pela Google Play e pela LGPD.

### Modified Capabilities

Nenhuma. As rotas são novas e públicas; nenhum requisito existente muda.

## Impact

- `apps/api/src/http/landing-pages.ts`: três rotas novas (`/legal`, `/termos`,
  `/privacidade`) reaproveitando o `renderPage` já existente, ou um layout irmão para
  documentos longos.
- `apps/api/src/http/app.ts`: nenhuma mudança — `landingPages` já está montado na raiz.
- `src/features/subscription/SubscriptionScreen.tsx`: nenhuma mudança; os links
  passam a funcionar.
- Nenhuma migration, nenhuma dependência nova, nenhuma variável de ambiente nova
  obrigatória.
- Deploy: sai junto no push para `main`, no mesmo serviço do Render.
- Externo: as URLs precisam ser cadastradas na ficha da Play Store e no App Store
  Connect depois do deploy — ação manual do usuário, fora do código.
