import { randomBytes } from "node:crypto"

// Autenticação do handshake do WebSocket.
//
// O navegador não permite enviar headers no construtor `WebSocket`, e o handshake
// é cross-origin — depender do cookie de sessão exigiria SameSite=None e CORS de
// upgrade, com falha silenciosa. Em vez disso o app pede um ticket pela rota
// autenticada normal e o apresenta na query da conexão.
//
// O ticket não é uma credencial reutilizável: vale uma vez, por poucos segundos,
// e só serve para vincular a conexão a um usuário.

const TICKET_TTL_MS = 60_000

type Ticket = { userId: string; expiresAt: number }

// Vive na memória do processo, como o registro de conexões: um ticket só faz
// sentido para o processo que vai receber aquele handshake.
const tickets = new Map<string, Ticket>()

// Remove os expirados. Chamado nas operações do módulo em vez de por intervalo:
// sem tráfego não há o que limpar, e o volume aqui é de um ticket por conexão.
function dropExpired(now: number) {
  for (const [token, ticket] of tickets) {
    if (ticket.expiresAt <= now) {
      tickets.delete(token)
    }
  }
}

export function issueTicket(userId: string): { ticket: string; expiresIn: number } {
  const now = Date.now()
  dropExpired(now)

  const token = randomBytes(32).toString("base64url")
  tickets.set(token, { userId, expiresAt: now + TICKET_TTL_MS })

  return { ticket: token, expiresIn: Math.floor(TICKET_TTL_MS / 1000) }
}

// Troca o ticket pelo dono e o invalida. Devolve null quando é desconhecido, já
// foi usado ou expirou — os três casos levam a conexão a ser recusada.
export function consumeTicket(token: string | undefined): string | null {
  if (!token) {
    return null
  }

  const now = Date.now()
  dropExpired(now)

  const ticket = tickets.get(token)

  if (!ticket) {
    return null
  }

  // Uso único: sai do mapa mesmo que a conexão falhe logo em seguida.
  tickets.delete(token)

  return ticket.expiresAt > now ? ticket.userId : null
}
