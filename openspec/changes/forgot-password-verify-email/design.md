## Context

**Estado atual.** O app chama `POST /api/auth/request-password-reset` (better-auth). O hook `sendResetPassword` em `apps/api/src/modules/auth/auth.ts:62` envia um email apontando para `getPasswordResetWebFallbackUrl(token)` → página `/auth/reset-password` (`apps/api/src/http/landing-pages.ts:114`), que **imprime o token na tela** e oferece um deep link `<scheme>://reset-password?token=`. A tela `src/app/(auth)/reset-password.tsx` tem um campo "Token" para colagem manual.

**Padrão a espelhar.** A verificação de email já resolve o mesmo problema de outra forma: `src/app/(auth)/verify-email.tsx` mostra o email, tem reenvio com cooldown de 60s e um botão "Já verifiquei meu email" que consulta `GET /api/auth/email-verification-status?email=` (`apps/api/src/modules/auth/email-verification-status.ts`). A tela de redefinição deve ficar visualmente e comportamentalmente igual.

**Restrição de segurança.** A consulta de verificação de email pode ser feita só com o email porque devolve apenas um booleano. A consulta de redefinição precisa devolver o **token de redefinição** — se ela fosse chaveada por email, qualquer pessoa que soubesse o email de um usuário poderia coletar o token assim que a vítima clicasse no link. Isso exige um segredo em posse exclusiva do app que iniciou o fluxo.

## Goals / Non-Goals

**Goals:**

- Recuperação de senha com a mesma mecânica da verificação de email: email → "Já verifiquei meu email" → tela de nova senha.
- Token de redefinição nunca visível ao usuário nem presente no email.
- Entrega do token apenas para o app que iniciou o fluxo **e** somente depois da confirmação por email (dois fatores independentes).
- Manter better-auth como dono da redefinição em si (expiração, `revokeSessionsOnPasswordReset`, hash da senha).
- Preservar a proteção anti-enumeração já existente.

**Non-Goals:**

- Polling automático da confirmação — a ação continua sendo um toque do usuário, como na verificação de email.
- Push/deep link abrindo o app direto a partir do email.
- Compatibilidade com APKs antigos no fluxo de recuperação de senha.
- Alterar o fluxo de verificação de email.

## Decisions

### 1. `requestId` como segredo do app, gerado pelo servidor

Na solicitação, a API gera um `requestId` aleatório (`randomUUID` + bytes aleatórios, via `node:crypto`) e o devolve na resposta. O app guarda em `expo-secure-store`. A consulta de status é chaveada **pelo `requestId`, nunca pelo email**.

Como a resposta é sempre `200` com um `requestId` — inclusive para email sem cadastro, caso em que nenhuma linha é criada e nenhum email é enviado — a proteção anti-enumeração continua idêntica à de hoje.

*Alternativa descartada:* consulta por email, como na verificação de email. Simples, mas entrega o token a qualquer um que saiba o email da vítima. *Alternativa descartada:* `requestId` gerado no cliente — o servidor passaria a confiar em entropia vinda do cliente, contrariando "nunca confiar em dados do cliente".

### 2. Tabela dedicada `PasswordResetRequest`, via migration

```prisma
model PasswordResetRequest {
  id                    String   @id            // sha256(requestId)
  email                 String                  // minúsculo
  confirmationTokenHash String   @unique        // sha256 do token do link
  resetToken            String                  // token do better-auth
  confirmedAt           DateTime?
  expiresAt             DateTime
  createdAt             DateTime @default(now())

  @@index([email])
  @@index([expiresAt])
}
```

O `requestId` e o token de confirmação são armazenados apenas como hash — vazamento do banco não permite assumir um fluxo em andamento. O `resetToken` fica em claro porque precisa ser devolvido ao app; ele vive no máximo 1 hora e a linha é **apagada assim que o token é entregue**, então a janela é curta e de uso único.

*Alternativa descartada:* reaproveitar a tabela `Verification` com prefixo de identifier, como `email-verification-tokens.ts` faz. Evitaria a migration, mas exigiria empacotar quatro campos em JSON dentro de `value` — schema sujo para uma entidade com ciclo de vida próprio.

*Alternativa descartada:* não persistir o `resetToken` e gerar o token do better-auth só no momento da confirmação, capturando-o do hook `sendResetPassword` em memória. Exigiria um `Map` global de promessas para interceptar o hook — esperto e frágil; a API roda em instância única hoje, mas o acoplamento ao hook é difícil de depurar.

### 3. Reuso do token de redefinição do better-auth

Na solicitação, a API chama internamente `auth.api.requestPasswordReset({ body: { email } })`. O hook `sendResetPassword` **deixa de enviar email**: ele grava a linha `PasswordResetRequest` com o `resetToken` e o hash do token de confirmação, invalida as solicitações anteriores do mesmo email e envia o email com o link de confirmação.

Assim, expiração (`resetPasswordTokenExpiresIn`), revogação de sessões e validação do token continuam sendo do better-auth. O app segue chamando `POST /api/auth/reset-password` com `{ token, newPassword }` — essa parte não muda.

O hook precisa correlacionar o `resetToken` com o `requestId` da chamada em andamento. Como o hook recebe apenas `{ user, token, url }`, o `requestId` e o token de confirmação são gerados **antes** da chamada e passados ao hook por `AsyncLocalStorage` (`node:async_hooks`), o que mantém a correlação correta mesmo com requisições concorrentes.

### 4. Endpoints próprios, fora do catch-all do better-auth

Em `apps/api/src/modules/auth/routes.ts`, registrados antes do `on(["GET","POST"], "/*")`, ao lado de `/email-verification-status`:

| Endpoint | Entrada | Saída |
| --- | --- | --- |
| `POST /api/auth/password-reset-request` | `{ email }` | `200 { requestId }` sempre; `400 INVALID_EMAIL` |
| `GET /api/auth/password-reset-status?requestId=` | — | `{ confirmed: false }` ou `{ confirmed: true, token }` |

A confirmação não é um endpoint de API: é a página `GET /auth/password-reset-confirm?token=` em `landing-pages.ts`, que faz `UPDATE ... SET confirmedAt` e renderiza o resultado. Ela substitui a página `/auth/reset-password`.

O `POST /api/auth/request-password-reset` do better-auth continua exposto pelo catch-all, mas o app não o usa mais. Como o hook `sendResetPassword` agora sempre envia o link de confirmação, quem chamar a rota antiga cria uma solicitação sem `requestId` recuperável — o fluxo simplesmente não completa. É a quebra do APK antigo, aceita e sinalizada na proposta.

### 5. Consulta de status consome a solicitação

Quando `confirmedAt` está preenchido, a consulta devolve o token e **apaga a linha** na mesma operação (`DELETE ... RETURNING`, para não haver corrida entre duas consultas simultâneas). Consultas seguintes respondem `confirmed: false`. Isso limita o estrago se o `requestId` vazar depois do uso.

### 6. Reenvio cria uma nova solicitação

O botão "Reenviar email" chama o mesmo `POST /password-reset-request` e substitui o `requestId` persistido. A criação apaga as solicitações anteriores do mesmo email (`deleteMany` por `email`), replicando `invalidatePreviousEmailVerificationTokens`. Um link antigo aberto depois disso não confirma nada.

### 7. Persistência no app

`src/features/auth/storage.ts` ganha `savePendingPasswordReset({ email, requestId })`, `getPendingPasswordReset()` e `clearPendingPasswordReset()`, com uma chave `pending-password-reset` guardando JSON — mesmo padrão e mesmo `secure-storage` já usados pelo email pendente.

A tela nova (`app/(auth)/verify-password-reset.tsx`) segue a estrutura de `verify-email.tsx`: params primeiro, fallback no storage, `ActivityIndicator` enquanto carrega, `Redirect` para o login se não houver nada. Estilos e textos espelham a tela existente.

### 8. Rate limit

Novas regras em `apps/api/src/http/rate-limit.ts`, na linha do que já existe:

- `auth:password-reset-request:ip` — 4 / 15 min (mesmo peso da regra atual de IP).
- `auth:password-reset-request:email` — 3 / 60 min (mesma da regra atual por email).
- `auth:password-reset-status:ip` — 30 / 15 min (igual à consulta de status de email).
- A regra atual `auth:password-reset:*` permanece cobrindo `POST /api/auth/reset-password`.

A página de confirmação fica fora do middleware `authRateLimit` (que cobre `/api/auth`); ela recebe uma proteção por IP própria ou herda a do roteador de landing pages, conforme já estiver montado.

## Risks / Trade-offs

- **`resetToken` gravado em claro** → linha apagada na entrega, expiração de 1 hora, e a linha só é criada para contas existentes. Acesso ao banco já implicaria comprometimento maior.
- **`requestId` vazado do dispositivo** → sozinho não basta: sem o clique no link do email a consulta responde `confirmed: false`, e depois da entrega a linha não existe mais.
- **Quebra do APK antigo** → sinalizada na proposta; usuários em versão antiga precisam atualizar para recuperar a senha. O restante do app continua funcionando.
- **`AsyncLocalStorage` no hook do better-auth** → se o contexto se perder, a solicitação não é gravada e o usuário não recebe email. Mitigação: falhar explicitamente com log de contexto (`type: "password_reset_hook_without_context"`) em vez de enviar email sem solicitação.
- **Usuário abre o link em outro dispositivo** → funciona: a confirmação é server-side e o app original é quem consulta o status. É exatamente o comportamento da verificação de email.
- **Usuário desinstala o app antes de confirmar** → perde o `requestId` e precisa recomeçar. Aceitável; o mesmo vale hoje para o email pendente.
- **Linhas expiradas acumulando** → limpeza oportunista por `expiresAt` na criação de novas solicitações, como o `cleanupExpiredBuckets` do rate limit faz.

## Migration Plan

1. Migration da tabela `PasswordResetRequest` (aditiva, sem impacto em dados existentes).
2. Deploy da API: novos endpoints, nova página de confirmação, remoção da página `/auth/reset-password` e do deep link.
3. Build do app com as telas novas.

Entre 2 e 3 há uma janela em que o app antigo não recupera senha — é a quebra já assumida. Rollback: reverter o deploy da API; a migration pode permanecer (tabela ociosa).

## Open Questions

- O texto do email de redefinição precisa de revisão de copy? A proposta assume ajuste mínimo: trocar "redefinir sua senha" por "confirmar a solicitação".
