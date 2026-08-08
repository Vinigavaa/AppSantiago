import { AsyncLocalStorage } from "node:async_hooks"

// O hook `sendResetPassword` do better-auth recebe apenas `{ user, token }` e
// nao tem como saber a qual solicitacao pertence. O contexto carrega o
// requestId e o token de confirmacao gerados antes da chamada ate o hook,
// mantendo a correlacao correta mesmo com requisicoes concorrentes.
export type PasswordResetContext = {
  requestId: string
  confirmationToken: string
}

const storage = new AsyncLocalStorage<PasswordResetContext>()

export function runWithPasswordResetContext<T>(
  context: PasswordResetContext,
  callback: () => Promise<T>,
) {
  return storage.run(context, callback)
}

export function getPasswordResetContext() {
  return storage.getStore() ?? null
}
