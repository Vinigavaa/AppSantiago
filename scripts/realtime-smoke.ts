// Smoke test do chat em tempo real (ticket + WebSocket /ws + eventos).
// Sobe o servidor real numa porta de teste (o WebSocket exige um servidor HTTP
// de verdade, então aqui não dá para usar `app.request`), cria um cliente e um
// profissional descartáveis e exercita: recusa de handshake sem ticket/inválido/
// reusado -> message:new -> message:read -> message:deleted -> heartbeat ->
// compatibilidade das respostas REST com o app já instalado.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/realtime-smoke.ts

import { serve } from "@hono/node-server"
import { prisma } from "@santiago/database"
import WebSocket from "ws"

import { app, injectWebSocket } from "../apps/api/src/http/app"

const port = 3399
const baseUrl = `http://127.0.0.1:${port}`
const wsUrl = `ws://127.0.0.1:${port}/ws`
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `rt_client_${suffix}@example.com`
const proEmail = `rt_pro_${suffix}@example.com`
const password = "Password123!"

let failures = 0

function check(label: string, condition: boolean, detail?: unknown) {
  console.log(`[${condition ? "PASS" : "FAIL"}] ${label}`)
  if (!condition) {
    failures += 1
    if (detail !== undefined) {
      console.log("       detail:", JSON.stringify(detail))
    }
  }
}

function req(path: string, ip: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { origin, "x-forwarded-for": ip, ...init.headers },
  })
}

async function signUpAndLogin(email: string, role: "CLIENT" | "PROFESSIONAL", ip: string) {
  const username = email.split("@")[0]!

  await req("/api/auth/sign-up/email", ip, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: username, username, displayUsername: username, email, password, role }),
  })

  await prisma.user.update({ where: { email }, data: { emailVerified: true } })

  const signIn = await req("/api/auth/sign-in/email", ip, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const setCookie = signIn.headers.get("set-cookie") ?? ""
  const cookie = setCookie
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")

  return (path: string, init: RequestInit = {}) =>
    req(path, ip, { ...init, headers: { cookie, ...init.headers } })
}

type Authed = Awaited<ReturnType<typeof signUpAndLogin>>

async function getTicket(authed: Authed): Promise<string> {
  const response = await authed("/api/app/realtime/ticket", { method: "POST" })
  const body = (await response.json()) as { ticket: string }
  return body.ticket
}

// Abre a conexão e resolve com o motivo de fechamento quando ela é recusada.
function expectRefused(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timer = setTimeout(() => {
      socket.terminate()
      reject(new Error("conexão não foi recusada dentro do prazo"))
    }, 5_000)

    socket.on("close", (code) => {
      clearTimeout(timer)
      resolve(code)
    })
    socket.on("error", () => {
      // Recusa no upgrade também conta: o erro vem antes do close em alguns casos.
    })
  })
}

// Conexão autenticada com fila de eventos, para o teste esperar por um evento
// específico sem depender da ordem de chegada.
type Client = {
  socket: WebSocket
  waitFor: (type: string, timeoutMs?: number) => Promise<Record<string, unknown>>
  close: () => void
}

async function connect(ticket: string): Promise<Client> {
  const socket = new WebSocket(`${wsUrl}?ticket=${ticket}`)
  const received: Record<string, unknown>[] = []
  const waiters: { type: string; resolve: (event: Record<string, unknown>) => void }[] = []

  socket.on("message", (raw) => {
    const event = JSON.parse(raw.toString()) as Record<string, unknown>
    const waiterIndex = waiters.findIndex((waiter) => waiter.type === event.type)

    if (waiterIndex >= 0) {
      waiters.splice(waiterIndex, 1)[0]!.resolve(event)
      return
    }

    received.push(event)
  })

  await new Promise<void>((resolve, reject) => {
    socket.on("open", () => resolve())
    socket.on("error", reject)
  })

  return {
    socket,
    waitFor(type, timeoutMs = 5_000) {
      const buffered = received.findIndex((event) => event.type === type)

      if (buffered >= 0) {
        return Promise.resolve(received.splice(buffered, 1)[0]!)
      }

      return new Promise((resolve, reject) => {
        const waiter = {
          type,
          resolve: (event: Record<string, unknown>) => {
            clearTimeout(timer)
            resolve(event)
          },
        }

        const timer = setTimeout(() => {
          // Sai da fila ao expirar: um waiter zumbi consumiria o próximo evento
          // desse tipo e o teste seguinte esperaria para sempre.
          const index = waiters.indexOf(waiter)

          if (index >= 0) {
            waiters.splice(index, 1)
          }

          reject(new Error(`evento ${type} não chegou`))
        }, timeoutMs)

        waiters.push(waiter)
      })
    },
    close: () => socket.close(),
  }
}

async function main() {
  const clientIp = `rt-client-${suffix}`
  const proIp = `rt-pro-${suffix}`

  const client = await signUpAndLogin(clientEmail, "CLIENT", clientIp)
  const pro = await signUpAndLogin(proEmail, "PROFESSIONAL", proIp)

  const proUser = await prisma.user.findUnique({ where: { email: proEmail }, select: { id: true } })
  const clientUser = await prisma.user.findUnique({
    where: { email: clientEmail },
    select: { id: true },
  })

  // --- Ticket ---------------------------------------------------------------

  const anonTicket = await req("/api/app/realtime/ticket", clientIp, { method: "POST" })
  check("ticket exige sessão", anonTicket.status === 401, anonTicket.status)

  const ticketResponse = await client("/api/app/realtime/ticket", { method: "POST" })
  const ticketBody = (await ticketResponse.json()) as { ticket?: string; expiresIn?: number }
  check("ticket emitido para sessão válida", ticketResponse.status === 200 && !!ticketBody.ticket)
  check("ticket tem validade curta", (ticketBody.expiresIn ?? 0) > 0 && (ticketBody.expiresIn ?? 0) <= 60, ticketBody.expiresIn)

  // --- Handshake recusado ---------------------------------------------------

  check("handshake sem ticket é recusado", (await expectRefused(wsUrl)) === 4001)
  check("handshake com ticket inválido é recusado", (await expectRefused(`${wsUrl}?ticket=nao-existe`)) === 4001)

  const singleUse = ticketBody.ticket!
  const firstUse = await connect(singleUse)
  check("handshake com ticket válido é aceito", firstUse.socket.readyState === WebSocket.OPEN)
  check("ticket reusado é recusado", (await expectRefused(`${wsUrl}?ticket=${singleUse}`)) === 4001)

  // --- Heartbeat ------------------------------------------------------------

  firstUse.socket.send(JSON.stringify({ type: "ping" }))
  await firstUse.waitFor("pong")
  check("heartbeat responde pong", true)

  firstUse.socket.send("payload malformado")
  firstUse.socket.send(JSON.stringify({ type: "message:new", chatId: "forjado" }))
  await new Promise((resolve) => setTimeout(resolve, 200))
  check("mensagem malformada/forjada não derruba a conexão", firstUse.socket.readyState === WebSocket.OPEN)

  firstUse.close()

  // --- Conversa -------------------------------------------------------------

  const openChat = await client("/api/app/chats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId: proUser!.id }),
  })
  const chatBody = (await openChat.json()) as { chat: { id: string } }
  const chatId = chatBody.chat.id
  check("conversa aberta", openChat.status === 200 && !!chatId)

  const clientSocket = await connect(await getTicket(client))
  const proSocket = await connect(await getTicket(pro))

  // --- message:new ----------------------------------------------------------

  const send = await client(`/api/app/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Olá, tudo bem?" }),
  })
  const sendBody = (await send.json()) as { message: { id: string; mine: boolean; read: boolean } }
  check("envio responde 201", send.status === 201, send.status)
  check("remetente vê a mensagem como sua", sendBody.message.mine === true)

  const newEvent = (await proSocket.waitFor("message:new")) as {
    chatId: string
    message: { id: string; content: string; mine: boolean; read: boolean }
  }
  check("destinatário recebe message:new", newEvent.chatId === chatId)
  check("evento traz a mensagem completa", newEvent.message.content === "Olá, tudo bem?")
  check("mensagem chega na perspectiva de quem recebe", newEvent.message.mine === false)
  check("mensagem chega como não lida", newEvent.message.read === false)
  check("evento usa o mesmo id do REST", newEvent.message.id === sendBody.message.id)

  // O remetente não pode receber o próprio evento (a tela dele já mostra a
  // mensagem pelo envio otimista).
  let senderGotEcho = false
  clientSocket.waitFor("message:new", 1_000).then(() => (senderGotEcho = true)).catch(() => {})
  await new Promise((resolve) => setTimeout(resolve, 1_200))
  check("remetente não recebe o próprio message:new", senderGotEcho === false)

  // --- message:read ---------------------------------------------------------

  const listMessages = await pro(`/api/app/chats/${chatId}/messages`)
  const listBody = (await listMessages.json()) as {
    otherUser: { userId: string }
    messages: { id: string; mine: boolean; read: boolean }[]
  }
  check("histórico responde 200", listMessages.status === 200)
  check("histórico mantém o formato { otherUser, messages }", !!listBody.otherUser && Array.isArray(listBody.messages))

  const readEvent = (await clientSocket.waitFor("message:read")) as {
    chatId: string
    messageIds: string[]
  }
  check("remetente recebe message:read", readEvent.chatId === chatId)
  check("recibo traz os ids lidos", readEvent.messageIds.includes(sendBody.message.id))

  // Abrir de novo, sem mensagens novas, não deve gerar evento.
  let secondReadEvent = false
  clientSocket.waitFor("message:read", 1_000).then(() => (secondReadEvent = true)).catch(() => {})
  await pro(`/api/app/chats/${chatId}/messages`)
  await new Promise((resolve) => setTimeout(resolve, 1_200))
  check("abrir sem mensagens novas não publica message:read", secondReadEvent === false)

  // --- Marcar como lida com a conversa já aberta -----------------------------

  // Cenário que o polling cobria por acidente: B está com a conversa aberta e a
  // mensagem chega pelo evento. Sem `POST /chats/:id/read` ela ficaria não lida
  // até a tela ser reaberta, e A nunca veria o recibo.
  const whileOpen = await client(`/api/app/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "chegou com a tela aberta" }),
  })
  const whileOpenBody = (await whileOpen.json()) as { message: { id: string } }
  await proSocket.waitFor("message:new")

  const markRead = await pro(`/api/app/chats/${chatId}/read`, { method: "POST" })
  const markReadBody = (await markRead.json()) as { read: number }
  check("marcar como lida responde 200", markRead.status === 200, markRead.status)
  check("marcar como lida informa quantas mudaram", markReadBody.read === 1, markReadBody)

  const openReadEvent = (await clientSocket.waitFor("message:read")) as { messageIds: string[] }
  check("recibo chega com a conversa aberta", openReadEvent.messageIds.includes(whileOpenBody.message.id))

  const noopRead = await pro(`/api/app/chats/${chatId}/read`, { method: "POST" })
  const noopReadBody = (await noopRead.json()) as { read: number }
  check("marcar como lida sem novidade não muda nada", noopReadBody.read === 0, noopReadBody)

  // --- message:deleted ------------------------------------------------------

  const toDelete = await client(`/api/app/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "mensagem que será excluída" }),
  })
  const toDeleteBody = (await toDelete.json()) as { message: { id: string } }
  await proSocket.waitFor("message:new")

  const deleted = await client(`/api/app/chats/${chatId}/messages/${toDeleteBody.message.id}`, {
    method: "DELETE",
  })
  check("exclusão responde 200", deleted.status === 200, deleted.status)

  const deletedEvent = (await proSocket.waitFor("message:deleted")) as {
    chatId: string
    messageId: string
  }
  check("destinatário recebe message:deleted", deletedEvent.messageId === toDeleteBody.message.id)
  check("evento de exclusão traz a conversa", deletedEvent.chatId === chatId)

  // --- Compatibilidade REST (APK instalada) ---------------------------------

  const chats = await pro("/api/app/chats")
  const chatsBody = (await chats.json()) as {
    chats: { id: string; unreadCount: number; lastMessage: unknown; otherUser: unknown }[]
    totalUnread: number
  }
  check("GET /chats mantém { chats, totalUnread }", chats.status === 200 && Array.isArray(chatsBody.chats) && typeof chatsBody.totalUnread === "number")

  const listed = chatsBody.chats.find((entry) => entry.id === chatId)
  check("conversa aparece na lista com os campos de sempre", !!listed && listed.lastMessage !== undefined && listed.otherUser !== undefined)

  // --- Autorização ----------------------------------------------------------

  // Um terceiro conectado não pode receber eventos de uma conversa alheia.
  const outsiderEmail = `rt_out_${suffix}@example.com`
  const outsiderIp = `rt-out-${suffix}`
  const outsider = await signUpAndLogin(outsiderEmail, "PROFESSIONAL", outsiderIp)
  const outsiderSocket = await connect(await getTicket(outsider))

  let outsiderGotEvent = false
  outsiderSocket.waitFor("message:new", 1_500).then(() => (outsiderGotEvent = true)).catch(() => {})
  await client(`/api/app/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "mensagem privada" }),
  })
  await proSocket.waitFor("message:new")
  check("quem não participa não recebe evento", outsiderGotEvent === false)

  // Bloqueio: nenhum evento entre bloqueados.
  await pro("/api/app/blocks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId: clientUser!.id }),
  })

  let blockedGotEvent = false
  proSocket.waitFor("message:new", 1_500).then(() => (blockedGotEvent = true)).catch(() => {})
  const blockedSend = await client(`/api/app/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "não deve chegar" }),
  })
  await new Promise((resolve) => setTimeout(resolve, 1_700))
  check("envio para bloqueado é recusado", blockedSend.status === 403, blockedSend.status)
  check("bloqueio não entrega evento", blockedGotEvent === false)

  clientSocket.close()
  proSocket.close()
  outsiderSocket.close()
}

const server = serve({ fetch: app.fetch, port })
injectWebSocket(server)

main()
  .catch((error) => {
    failures += 1
    console.error("erro inesperado:", error)
  })
  .finally(async () => {
    await prisma.$disconnect()
    server.close()
    console.log(failures === 0 ? "\nTodos os checks passaram." : `\n${failures} check(s) falharam.`)
    process.exit(failures === 0 ? 0 : 1)
  })
