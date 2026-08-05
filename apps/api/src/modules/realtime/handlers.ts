import type { AuthedContext } from "@/modules/shared/require-auth"

import { issueTicket } from "./tickets"

// Emite o ticket que autentica o handshake do WebSocket. Rota autenticada como
// qualquer outra do app: quem chega aqui já teve a sessão validada pelo
// `requireAuth`, e o ticket herda a identidade dessa sessão.
export async function createRealtimeTicketHandler(context: AuthedContext) {
  const user = context.get("user")

  return context.json(issueTicket(user.id))
}
