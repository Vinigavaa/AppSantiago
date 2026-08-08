## Context

A API é um Hono único hospedado no Render, com deploy automático pelo `main`. O
`apps/api/src/http/app.ts` já monta `landingPages` na raiz (`app.route("/", landingPages)`),
e esse módulo hoje serve duas páginas HTML de callback de autenticação: confirmação
de email e confirmação de redefinição de senha. Existe um helper `renderPage` que
desenha um **card centralizado** com badge, título, um parágrafo e botões — a forma
certa para uma mensagem curta com call-to-action, e a forma errada para um documento
jurídico de várias seções.

Qualquer rota fora das duas cai no `app.notFound`, que responde
`{"code":"NOT_FOUND"}` em JSON — é exatamente isso que `/termos` e `/privacidade`
retornam hoje.

Os textos precisam refletir o sistema real. O schema em
`packages/database/prisma/schema.prisma` mostra os dados pessoais efetivamente
armazenados: `User` (nome, email, telefone, avatar), `Session` (IP, user-agent),
`ClientProfile`/`ProfessionalProfile` (CPF/CNPJ opcional em `document`, bio),
`ServiceRequest` (endereço completo do pedido), `ServiceRequestPhoto` e anexos de
mensagem (imagens no Cloudinary, com `publicId`), chat, avaliações e token de push do
dispositivo. Operadores terceiros em uso: Render (hospedagem), PostgreSQL gerenciado,
Resend (email), Cloudinary (imagens), Expo (push) e RevenueCat + Apple/Google
(assinaturas).

## Goals / Non-Goals

**Goals:**

- Colocar `/termos`, `/privacidade` e `/legal` no ar, funcionando para os builds do
  app **já publicados**, sem novo build e sem mudança de variável de ambiente.
- Textos honestos: a Política descreve os dados que o sistema realmente guarda, nem
  mais nem menos.
- Formato adequado a documento longo, legível no celular, sem recurso externo.
- Um único ponto para o nome e o email do controlador.

**Non-Goals:**

- Aceite de termos no cadastro, versionamento de documento, re-aceite, ou registro de
  consentimento no banco. Nada disso é exigido pelas lojas hoje e implicaria migration
  e mudança de fluxo no app.
- Internacionalização. O app é pt-BR.
- CMS ou edição dos textos fora do repositório.
- Revisão jurídica profissional — o texto é um rascunho fundamentado, não um parecer.

## Decisions

### Módulo próprio `legal-pages.ts`, não dentro de `landing-pages.ts`

`landing-pages.ts` tem uma responsabilidade clara: páginas de callback dos fluxos de
autenticação, todas curtas e com deep link para o app. Documentos jurídicos são outra
coisa — outro layout, outro ciclo de vida, outro motivo para mudar.

Criar `apps/api/src/http/legal-pages.ts` com seu próprio `renderDocument` e montá-lo
em `app.ts` com `app.route("/", legalPages)`.

*Alternativa descartada:* reaproveitar `renderPage`. O card de largura 480px com um
único parágrafo não comporta um documento de seções; adaptá-lo para os dois usos
deixaria a função cheia de condicionais e pioraria as páginas de auth.

*Duplicação aceita:* `escapeHtml` e a paleta de cores aparecerão nos dois módulos.
São ~8 linhas triviais. Extrair um módulo compartilhado agora criaria uma camada para
duas chamadas — pode ser feito depois, se um terceiro caso aparecer.

### Conteúdo como dado em TypeScript, não arquivos `.html` estáticos

Os documentos ficam como uma estrutura declarativa no módulo:

```ts
type Section = { heading: string; paragraphs: string[]; bullets?: string[] }
```

O `renderDocument` recebe título, data de atualização e as seções, e devolve o HTML.

*Alternativa descartada:* servir `.html` de disco com `serveStatic`. Exigiria garantir
que os arquivos sejam copiados para o diretório de build no Render — um modo de falha
silencioso que só aparece em produção. O módulo TS compila junto com o resto e não
tem esse risco.

### Contato do controlador em constante, não em variável de ambiente

```ts
const CONTROLLER = { name: "...", email: "..." }
```

Uma env faltando no Render faria a página legal renderizar vazia ou com fallback
errado — e ninguém perceberia até a reprovação na loja. Uma constante no repositório
é revisável no diff e impossível de esquecer. Nome e email de contato de um serviço
público não são segredo.

### Data de atualização fixa e manual

`const LAST_UPDATED = "8 de agosto de 2026"` — nunca `new Date()`. Uma data dinâmica
afirmaria que o documento foi revisado hoje toda vez que a página abre, o que é falso
e enfraquece o próprio documento.

### `/legal` como índice, além das duas páginas

A Play Store pede uma URL de privacidade; a Apple pede as duas acessíveis. Ter um
índice dá uma URL única e estável para as fichas, e um lugar para o usuário chegar
digitando. Custa uma rota de dez linhas.

### Rotas fora do rate limit e do CORS

São GETs de navegador, servindo HTML constante, sem banco. O CORS não se aplica
(navegação direta, não fetch cross-origin) e o rate limit existente é por rota de API
autenticada. Não adicionar nenhum dos dois.

## Risks / Trade-offs

- **O texto não passou por advogado** → O documento é um rascunho fundamentado no
  comportamento real do sistema, suficiente para a submissão às lojas. Registrar no
  README/handoff que revisão jurídica é recomendada antes de escalar a base de
  usuários.
- **A Política pode divergir do sistema conforme o app evolui** → Cada seção de dados
  coletados é escrita a partir do schema. Incluir na revisão de mudanças futuras que
  toquem em coleta de dados uma checagem contra este documento.
- **URL em `onrender.com` na ficha da loja** → Funciona e é aceito, mas se o projeto
  migrar para domínio próprio, as URLs cadastradas nas lojas precisam ser atualizadas
  manualmente. Como o app usa `EXPO_PUBLIC_TERMS_URL`/`EXPO_PUBLIC_PRIVACY_URL` com
  fallback, o app acompanha a migração por env; as lojas não.
- **Nome e email do controlador ainda não definidos** → Bloqueia o deploy, não a
  implementação: o restante do trabalho é feito e a constante é preenchida antes do
  push. Ver Open Questions.

## Migration Plan

1. Implementar e verificar localmente (`/termos`, `/privacidade`, `/legal` respondem
   200 em HTML).
2. Preencher a constante `CONTROLLER` com nome e email reais.
3. Push para `main` → deploy automático no Render.
4. Verificar as três URLs em produção pelo navegador e pelo celular.
5. Cadastrar `https://appsantiago.onrender.com/privacidade` na ficha da Play Store e
   as duas URLs no App Store Connect.

*Rollback:* remover as rotas e reverter o commit. Nenhum estado persistido, nenhuma
migration — o rollback é integral e sem efeito colateral.

## Open Questions

- **Nome completo e email de contato do controlador.** Necessários antes do deploy
  (passo 2). Se o email de contato ainda não existir no domínio, um endereço pessoal
  é aceitável pela LGPD e pelas lojas — o que não é aceitável é a página não trazer
  canal de contato algum.
