import type { WSContext } from "hono/ws"

import type { RealtimeEvent } from "./types"

// Registro das conexões abertas, em memória do processo.
//
// LIMITE CONHECIDO E ASSUMIDO: isso só funciona com uma única instância da API.
// Com duas, um usuário conectado na instância A não receberia um evento
// publicado na B. Se um dia a API escalar horizontalmente, a troca por um
// pub/sub fica contida neste arquivo — os handlers só conhecem `publish`.

type Connection = WSContext<unknown>

// Um usuário pode ter mais de uma conexão (app e web abertos ao mesmo tempo).
const connectionsByUser = new Map<string, Set<Connection>>()

export function addConnection(userId: string, connection: Connection) {
  const existing = connectionsByUser.get(userId)

  if (existing) {
    existing.add(connection)
    return
  }

  connectionsByUser.set(userId, new Set([connection]))
}

export function removeConnection(userId: string, connection: Connection) {
  const connections = connectionsByUser.get(userId)

  if (!connections) {
    return
  }

  connections.delete(connection)

  // Sem a limpeza da chave, o mapa acumularia um Set vazio por usuário que já
  // passou pelo servidor.
  if (connections.size === 0) {
    connectionsByUser.delete(userId)
  }
}

// Entrega um evento a todas as conexões do usuário.
//
// Nunca lança: a publicação é complementar ao fluxo REST — a operação que a
// originou já foi gravada e não pode falhar por causa de um socket. Usuário sem
// conexão aberta simplesmente não recebe; ele carrega o estado ao abrir a tela.
export function publish(userId: string, event: RealtimeEvent) {
  const connections = connectionsByUser.get(userId)

  if (!connections || connections.size === 0) {
    return
  }

  const payload = JSON.stringify(event)

  for (const connection of connections) {
    try {
      connection.send(payload)
    } catch (error) {
      console.error("[realtime] falha ao entregar evento", {
        userId,
        type: event.type,
        error,
      })
    }
  }
}
