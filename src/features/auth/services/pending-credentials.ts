// Credenciais do cadastro mantidas APENAS em memória (não persistidas) para
// tentar um login silencioso assim que o email for verificado. São descartadas
// ao concluir o login ou ao reiniciar o app.
type PendingCredentials = {
  email: string
  password: string
}

let pendingCredentials: PendingCredentials | null = null

export function setPendingCredentials(credentials: PendingCredentials) {
  pendingCredentials = credentials
}

export function getPendingCredentials(): PendingCredentials | null {
  return pendingCredentials
}

export function clearPendingCredentials() {
  pendingCredentials = null
}
