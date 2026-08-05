import { createNodeWebSocket } from "@hono/node-ws"
import type { Hono } from "hono"

import { addConnection, removeConnection } from "./registry"
import { consumeTicket } from "./tickets"
import type { RealtimeEvent } from "./types"

// Código de fechamento na faixa reservada à aplicação (4000-4999). O app
// distingue "fui recusado" de "a conexão caiu" para não insistir com um ticket
// que já não vale.
const CLOSE_UNAUTHORIZED = 4001

function send(ws: { send: (data: string) => void }, event: RealtimeEvent) {
  ws.send(JSON.stringify(event))
}

// Registra o endpoint `GET /ws` e devolve o injetor que liga o upgrade ao
// servidor HTTP (chamado em `src/index.ts`, depois do `serve`).
//
// A autenticação é o ticket de uso único da query — o handshake não carrega o
// cookie de sessão de forma confiável no navegador. Depois do `onOpen`, a
// identidade da conexão é só a resolvida aqui: nada que o cliente enviar pelo
// socket muda quem ele é.
export function registerRealtimeWebSocket(app: Hono) {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  app.get(
    "/ws",
    upgradeWebSocket((context) => {
      const ticket = context.req.query("ticket")
      // Preenchido no onOpen e usado para desregistrar no close/error.
      let userId: string | null = null

      return {
        onOpen(_event, ws) {
          userId = consumeTicket(ticket)

          if (!userId) {
            // Ticket ausente, desconhecido, expirado ou já usado: a conexão
            // morre aqui, sem nunca receber um evento.
            ws.close(CLOSE_UNAUTHORIZED, "unauthorized")
            return
          }

          addConnection(userId, ws)
        },

        onMessage(event, ws) {
          if (!userId) {
            return
          }

          // O canal é servidor → app. A única coisa que o app manda é o
          // heartbeat; qualquer outra mensagem é ignorada de propósito.
          if (typeof event.data !== "string") {
            return
          }

          // Payload malformado não pode derrubar o handler: qualquer coisa que
          // não seja um ping válido é simplesmente descartada.
          let parsed: { type?: string } | null = null

          try {
            parsed = JSON.parse(event.data) as { type?: string } | null
          } catch {
            return
          }

          if (parsed?.type === "ping") {
            send(ws, { type: "pong" })
          }
        },

        onClose(_event, ws) {
          if (userId) {
            removeConnection(userId, ws)
          }
        },

        onError(_event, ws) {
          if (userId) {
            removeConnection(userId, ws)
          }
        },
      }
    }),
  )

  return injectWebSocket
}
