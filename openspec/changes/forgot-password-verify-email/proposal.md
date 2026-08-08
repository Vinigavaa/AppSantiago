## Why

Hoje o "Esqueci minha senha" envia um email cujo link abre uma página web que **exibe o token** de redefinição, e o usuário precisa copiar esse token e colar manualmente na tela "Nova senha" do app. É um fluxo confuso, quebra em quem abre o email no celular e expõe o token em texto na tela do navegador.

O app já tem um fluxo de confirmação por email que funciona bem e é familiar ao usuário: a tela de verificação de email com o botão "Já verifiquei meu email". A recuperação de senha deve seguir exatamente esse mesmo padrão.

## What Changes

- Ao enviar o email em "Esqueci minha senha", o app passa a navegar para uma **tela de confirmação de redefinição** (espelho da tela de verificação de email), com: email destacado, botão "Reenviar email" com cooldown de 60s, botão "Já verifiquei meu email" e saída para o login.
- O email de redefinição passa a conter um **link de confirmação**, não mais o token. Clicar no link apenas confirma a solicitação no servidor e mostra uma página pedindo para voltar ao app.
- O botão "Já verifiquei meu email" consulta o servidor. Se a solicitação foi confirmada pelo link, o servidor devolve o token de redefinição e o app navega direto para a tela "Nova senha" com o token já preenchido. Se não foi confirmada, mostra mensagem pedindo para abrir o email.
- A tela "Nova senha" **perde o campo Token** — o token passa a chegar sempre por parâmetro de navegação. Sem token, a tela redireciona para "Esqueci minha senha".
- **BREAKING**: a página web `/auth/reset-password` deixa de exibir o token e o deep link `<scheme>://reset-password?token=` deixa de ser gerado. APKs antigos que dependem de colar o token manualmente param de funcionar no fluxo de recuperação de senha (o cliente precisa atualizar o app).
- Novos endpoints públicos de recuperação com rate limit próprio; o `POST /api/auth/request-password-reset` do better-auth deixa de ser chamado diretamente pelo app.

## Capabilities

### New Capabilities

- `password-reset`: fluxo completo de recuperação de senha por confirmação de email — solicitação, reenvio, confirmação via link, consulta de status pelo app e redefinição da senha.

### Modified Capabilities

<!-- Não há specs existentes em openspec/specs/ — nada a modificar. -->

## Impact

**Backend (`apps/api`)**
- `src/modules/auth/auth.ts` — hook `sendResetPassword` passa a persistir o token e enviar o link de confirmação.
- `src/modules/auth/auth-urls.ts` — nova URL de confirmação; remoção da URL de deep link do reset.
- `src/modules/auth/routes.ts` — novos endpoints `POST /password-reset-request` e `GET /password-reset-status`.
- Novo módulo de solicitações de redefinição (criação, confirmação, consulta, expiração).
- `src/http/landing-pages.ts` — página `/auth/reset-password` substituída pela página de confirmação.
- `src/http/rate-limit.ts` — regras para os novos endpoints.
- `src/services/email-service.ts` — texto do email de redefinição ajustado ao novo fluxo.

**Banco de dados (`packages/database`)**
- Nova migration com a tabela de solicitações de redefinição de senha.

**Mobile (`src/`)**
- `app/(auth)/forgot-password.tsx` — navega para a nova tela após o envio.
- Nova tela `app/(auth)/verify-password-reset.tsx`.
- `app/(auth)/reset-password.tsx` — remoção do campo Token.
- `features/auth/services/auth-service.ts`, `features/auth/hooks/useAuth.ts`, `features/auth/storage.ts`, `features/auth/schemas/auth-schemas.ts`, `constants/routes.ts`.

**Homologação**
- Android Studio e Web, com envio real de email pela Resend.
