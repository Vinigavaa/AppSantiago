import { AppState, type AppStateStatus } from "react-native"

import { authBaseUrl } from "@/lib/auth-client"

import { fetchRealtimeTicket } from "./service"
import type { RealtimeEvent } from "./types"

// Conexão única de eventos do servidor, compartilhada por todas as telas.
//
// O estado vive no escopo do módulo (não em um contexto React) porque a conexão
// não pertence a nenhuma tela: quem entra assina, quem sai desassina, e a
// conexão existe enquanto houver ao menos um assinante.

// Heartbeat: sem ele, uma conexão cortada por proxy continua "aberta" para o app
// e o chat silencia sem ninguém perceber — o pior modo de falha possível depois
// de remover o polling.
const HEARTBEAT_INTERVAL_MS = 25_000
const PONG_TIMEOUT_MS = 10_000

// Backoff com teto: durante o cold start do servidor várias tentativas vão
// falhar seguidas, e martelar não acelera nada.
const RECONNECT_BASE_MS = 1_000
const RECONNECT_MAX_MS = 15_000

type Subscriber = {
  onEvent?: (event: RealtimeEvent) => void
  // Chamado a cada conexão estabelecida (inclusive reconexões): é o gatilho de
  // reconciliação das telas, que recuperam o que aconteceu enquanto o app
  // esteve desconectado.
  onConnected?: () => void
}

const subscribers = new Set<Subscriber>()

let socket: WebSocket | null = null
let connecting = false
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let pongTimer: ReturnType<typeof setTimeout> | null = null
let appStateSubscription: { remove: () => void } | null = null

function realtimeUrl(ticket: string): string {
  const base = authBaseUrl.replace(/^http/, "ws")
  return `${base}/ws?ticket=${encodeURIComponent(ticket)}`
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
  if (timer !== null) {
    clearTimeout(timer)
  }
}

function stopHeartbeat() {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  clearTimer(pongTimer)
  pongTimer = null
}

function startHeartbeat() {
  stopHeartbeat()

  heartbeatTimer = setInterval(() => {
    if (socket?.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(JSON.stringify({ type: "ping" }))

    // Sem resposta na janela, a conexão é considerada morta e reiniciada.
    if (pongTimer === null) {
      pongTimer = setTimeout(() => {
        pongTimer = null
        dropConnection()
        scheduleReconnect()
      }, PONG_TIMEOUT_MS)
    }
  }, HEARTBEAT_INTERVAL_MS)
}

// Fecha e esquece o socket atual sem mexer nos assinantes.
function dropConnection() {
  stopHeartbeat()

  if (socket) {
    // Os handlers são removidos antes do close para que este fechamento
    // deliberado não dispare outra reconexão pelo `onclose`.
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    socket.close()
    socket = null
  }

  connecting = false
}

function scheduleReconnect() {
  if (reconnectTimer !== null || subscribers.size === 0) {
    return
  }

  // Exponencial com teto e jitter — o jitter evita que todos os clientes voltem
  // no mesmo instante depois de uma queda do servidor.
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS)
  const jitter = Math.random() * 0.3 * delay

  reconnectAttempts += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void connect()
  }, delay + jitter)
}

function handleEvent(event: RealtimeEvent) {
  for (const subscriber of subscribers) {
    subscriber.onEvent?.(event)
  }
}

async function connect() {
  // Um socket já aberto ou em abertura é reutilizado: telas adicionais nunca
  // abrem uma segunda conexão.
  if (connecting || socket !== null || subscribers.size === 0) {
    return
  }

  connecting = true

  const result = await fetchRealtimeTicket()

  // Assinantes podem ter saído enquanto o ticket era buscado.
  if (subscribers.size === 0) {
    connecting = false
    return
  }

  if (!result.ok) {
    connecting = false
    scheduleReconnect()
    return
  }

  const next = new WebSocket(realtimeUrl(result.data.ticket))
  socket = next

  next.onopen = () => {
    connecting = false
    reconnectAttempts = 0
    startHeartbeat()

    // Reconciliação: cada tela recarrega uma vez o seu estado. É disparado por
    // conexão, não por tempo — com a conexão estável, nada mais é pedido.
    for (const subscriber of subscribers) {
      subscriber.onConnected?.()
    }
  }

  next.onmessage = (message) => {
    if (typeof message.data !== "string") {
      return
    }

    let event: RealtimeEvent

    try {
      event = JSON.parse(message.data) as RealtimeEvent
    } catch {
      return
    }

    if (event.type === "pong") {
      clearTimer(pongTimer)
      pongTimer = null
      return
    }

    handleEvent(event)
  }

  next.onerror = () => {
    // No React Native o `onclose` nem sempre vem depois do erro: derrubar aqui
    // garante que a reconexão seja agendada uma vez só.
    if (socket === next) {
      dropConnection()
      scheduleReconnect()
    }
  }

  next.onclose = () => {
    if (socket === next) {
      dropConnection()
      scheduleReconnect()
    }
  }
}

function handleAppStateChange(state: AppStateStatus) {
  if (state === "active") {
    reconnectAttempts = 0
    void connect()
    return
  }

  // Em segundo plano o socket é suspenso pelo iOS e pode ser derrubado sem aviso
  // pelo Android. Manter uma conexão zumbi só atrasa a percepção da queda —
  // quem avisa com o app fechado é o push. Ao voltar, reconecta e reconcilia.
  clearTimer(reconnectTimer)
  reconnectTimer = null
  dropConnection()
}

// Assina os eventos do servidor. A primeira assinatura abre a conexão; as
// seguintes reaproveitam a mesma. Devolve a função de cancelamento — o par
// assinar/cancelar é o que impede ouvintes duplicados entre montagens.
export function subscribe(subscriber: Subscriber): () => void {
  subscribers.add(subscriber)

  if (appStateSubscription === null) {
    appStateSubscription = AppState.addEventListener("change", handleAppStateChange)
  }

  void connect()

  return () => {
    subscribers.delete(subscriber)

    if (subscribers.size === 0) {
      closeRealtime()
    }
  }
}

// Encerra a conexão e zera o estado do módulo. Chamado quando o último
// assinante sai e no logout.
export function closeRealtime() {
  clearTimer(reconnectTimer)
  reconnectTimer = null
  reconnectAttempts = 0

  dropConnection()

  appStateSubscription?.remove()
  appStateSubscription = null
}
