## 1. Banco de dados

- [x] 1.1 Adicionar o model `PasswordResetRequest` ao schema Prisma em `packages/database` (id, email, confirmationTokenHash único, resetToken, confirmedAt, expiresAt, createdAt, índices em email e expiresAt)
- [x] 1.2 Gerar e aplicar a migration correspondente e regenerar o client Prisma

## 2. Backend — módulo de solicitações de redefinição

- [x] 2.1 Criar `apps/api/src/modules/auth/password-reset-requests.ts` com hash (sha256) do `requestId` e do token de confirmação, seguindo o padrão de `email-verification-tokens.ts`
- [x] 2.2 Implementar `createPasswordResetRequest` — apaga solicitações anteriores do mesmo email, remove expiradas e grava a nova linha com expiração de 1 hora
- [x] 2.3 Implementar `confirmPasswordResetRequest(confirmationToken)` — marca `confirmedAt` apenas se não expirada; retorna se a confirmação teve efeito
- [x] 2.4 Implementar `consumeConfirmedPasswordResetRequest(requestId)` — devolve o `resetToken` e apaga a linha na mesma operação (`DELETE ... RETURNING`), retornando nulo quando não confirmada, expirada ou inexistente

## 3. Backend — geração do token e email

- [x] 3.1 Criar o contexto `AsyncLocalStorage` que transporta `{ requestId, confirmationToken }` até o hook `sendResetPassword`
- [x] 3.2 Ajustar `sendResetPassword` em `apps/api/src/modules/auth/auth.ts` para gravar a solicitação com o `resetToken` do better-auth e enviar o email com o link de confirmação, sem expor o token
- [x] 3.3 Falhar com log de contexto (`type: "password_reset_hook_without_context"`) quando o hook rodar sem o contexto, em vez de enviar email
- [x] 3.4 Em `auth-urls.ts`: adicionar `passwordResetConfirmPath` e `getPasswordResetConfirmUrl(token)`; remover `getPasswordResetUrl` e `getPasswordResetWebFallbackUrl` junto com `resetPasswordLandingPath`
- [x] 3.5 Ajustar o texto do email de redefinição em `apps/api/src/services/email-service.ts` para "confirmar a solicitação" em vez de "redefinir sua senha"

## 4. Backend — endpoints

- [x] 4.1 Criar o handler `POST /password-reset-request`: valida o email com zod (`400 INVALID_EMAIL`), gera `requestId`, chama `auth.api.requestPasswordReset` dentro do contexto e responde `200 { requestId }` sempre, inclusive para email sem cadastro
- [x] 4.2 Criar o handler `GET /password-reset-status?requestId=`: responde `{ confirmed: true, token }` quando consumível e `{ confirmed: false }` em qualquer outro caso, sem distinguir motivos
- [x] 4.3 Registrar as duas rotas em `apps/api/src/modules/auth/routes.ts` antes do catch-all do better-auth
- [x] 4.4 Substituir a landing page `/auth/reset-password` por `/auth/password-reset-confirm` em `apps/api/src/http/landing-pages.ts`: confirma a solicitação, mostra sucesso pedindo para voltar ao app, e responde `400` para token ausente, inválido ou expirado — sem exibir token em tela
- [x] 4.5 Adicionar as regras de rate limit em `apps/api/src/http/rate-limit.ts`: `password-reset-request` por IP (4/15min) e por email (3/60min), e `password-reset-status` por IP (30/15min)

## 5. Mobile — serviços e estado

- [x] 5.1 Adicionar `savePendingPasswordReset`, `getPendingPasswordReset` e `clearPendingPasswordReset` em `src/features/auth/storage.ts` (chave `pending-password-reset`, JSON com email e requestId)
- [x] 5.2 Em `src/features/auth/services/auth-service.ts`: reescrever `requestPasswordReset` para chamar `/password-reset-request` e devolver o `requestId`, e adicionar `getPasswordResetStatus(requestId)` com o mesmo tratamento de erro amigável já usado por `getEmailVerificationStatus`
- [x] 5.3 Em `src/features/auth/hooks/useAuth.ts`: `requestPasswordReset` persiste o `requestId` e navega para a nova tela; `resetPassword` passa a levar ao login após o sucesso
- [x] 5.4 Remover o campo `token` de `resetPasswordSchema` em `src/features/auth/schemas/auth-schemas.ts`
- [x] 5.5 Adicionar a rota `verifyPasswordReset` em `src/constants/routes.ts`

## 6. Mobile — telas

- [x] 6.1 Criar `src/app/(auth)/verify-password-reset.tsx` espelhando `verify-email.tsx`: email destacado, reenvio com cooldown de 60s, "Já verifiquei meu email", saída para o login, fallback do storage e `Redirect` para o login sem solicitação
- [x] 6.2 Na ação "Já verifiquei meu email": em caso de confirmação, limpar o pendente e `router.replace` para `/reset-password` com o token; caso contrário, exibir mensagem de erro sem sair da tela
- [x] 6.3 No reenvio: criar nova solicitação, substituir o `requestId` persistido e reiniciar o cooldown
- [x] 6.4 Ajustar `src/app/(auth)/forgot-password.tsx` para navegar após o envio (sem mensagem de sucesso na própria tela)
- [x] 6.5 Ajustar `src/app/(auth)/reset-password.tsx`: remover o campo Token, ler o token do parâmetro e redirecionar para `/forgot-password` quando ausente

## 7. Limpeza e verificação

- [x] 7.1 Remover código morto do fluxo antigo (deep link do reset, página `/auth/reset-password`, helpers de URL não usados, campo e mensagens de token)
- [x] 7.2 Rodar typecheck e lint da API e do mobile
- [ ] 7.3 Homologar no Android Studio e na Web o fluxo completo com envio real: solicitar → receber email → confirmar pelo link → "Já verifiquei meu email" → redefinir → entrar com a nova senha
- [ ] 7.4 Homologar os caminhos de erro: link expirado, "Já verifiquei" antes de confirmar, reenvio dentro do cooldown, app reaberto na tela de confirmação e segunda consulta após o token já entregue
- [x] 7.5 Atualizar o `scripts/auth-security-smoke.ts` e a seção de recuperação de senha do `README.md` para o novo fluxo
