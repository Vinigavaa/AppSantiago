// Smoke test do chat (rotas /api/app/chats).
// Cria um cliente e um profissional descartáveis, valida o e-mail direto no
// banco, e exercita: abrir conversa -> enviar -> não-lidas -> recibo de leitura
// -> reuso da mesma conversa -> par inválido (cliente com cliente) bloqueado.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/chat-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `chat_client_${suffix}@example.com`
const client2Email = `chat_client2_${suffix}@example.com`
const proEmail = `chat_pro_${suffix}@example.com`
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
  return app.request(`${baseUrl}${path}`, {
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

  const call = (path: string, init: RequestInit = {}) =>
    req(path, ip, { ...init, headers: { cookie, ...init.headers } })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  return { call, userId: user!.id }
}

async function main() {
  const client = await signUpAndLogin(clientEmail, "CLIENT", `chat-c-${suffix}`)
  const client2 = await signUpAndLogin(client2Email, "CLIENT", `chat-c2-${suffix}`)
  const pro = await signUpAndLogin(proEmail, "PROFESSIONAL", `chat-p-${suffix}`)

  // Cliente abre uma conversa com o profissional (sem proposta/solicitação).
  const openRes = await client.call("/api/app/chats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId: pro.userId }),
  })
  const opened = (await openRes.json()) as { chat?: { id: string; otherUser?: { role: string } } }
  const chatId = opened.chat?.id
  check("cliente abre conversa com profissional", Boolean(chatId), opened)
  check("outro participante é o profissional", opened.chat?.otherUser?.role === "PROFESSIONAL", opened)

  // Reabrir deve reutilizar a MESMA conversa (histórico preservado).
  const reopenRes = await client.call("/api/app/chats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId: pro.userId }),
  })
  const reopened = (await reopenRes.json()) as { chat?: { id: string } }
  check("reabrir reutiliza a mesma conversa", reopened.chat?.id === chatId, reopened)

  // Cliente envia uma mensagem.
  const sendRes = await client.call(`/api/app/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Olá, tudo bem? Pode me passar um orçamento?" }),
  })
  const sent = (await sendRes.json()) as { message?: { id: string; mine: boolean; read: boolean } }
  check("cliente envia mensagem", Boolean(sent.message?.id) && sent.message?.mine === true, sent)

  // Profissional lista conversas: vê 1 com 1 não-lida.
  const proListRes = await pro.call("/api/app/chats")
  const proList = (await proListRes.json()) as {
    chats: { id: string; unreadCount: number; lastMessage: { mine: boolean } | null }[]
    totalUnread: number
  }
  const proChat = proList.chats.find((chat) => chat.id === chatId)
  check("profissional vê a conversa na lista", Boolean(proChat), proList)
  check("conversa aparece com 1 não-lida", proChat?.unreadCount === 1, proChat)
  check("prévia mostra mensagem recebida (mine=false)", proChat?.lastMessage?.mine === false, proChat)
  check("total de não-lidas do profissional é 1", proList.totalUnread === 1, proList)

  // Profissional abre a conversa: marca como lida e vê a mensagem do cliente.
  const proMsgsRes = await pro.call(`/api/app/chats/${chatId}/messages`)
  const proMsgs = (await proMsgsRes.json()) as {
    otherUser: { role: string }
    messages: { content: string; mine: boolean; read: boolean }[]
  }
  check("profissional lê a mensagem do cliente", proMsgs.messages.length === 1, proMsgs)
  check("do lado do profissional a mensagem é recebida", proMsgs.messages[0]?.mine === false, proMsgs)
  check("para o profissional o outro é o cliente", proMsgs.otherUser.role === "CLIENT", proMsgs)

  // Depois de aberta pelo profissional, a lista do profissional zera não-lidas.
  const proList2 = (await (await pro.call("/api/app/chats")).json()) as { totalUnread: number }
  check("não-lidas do profissional zeram após abrir", proList2.totalUnread === 0, proList2)

  // Cliente reabre a conversa: agora sua mensagem aparece como LIDA (recibo).
  const clientMsgs = (await (await client.call(`/api/app/chats/${chatId}/messages`)).json()) as {
    messages: { mine: boolean; read: boolean }[]
  }
  check("remetente vê recibo de leitura (read=true)", clientMsgs.messages[0]?.read === true, clientMsgs)

  // Par inválido: cliente não pode iniciar conversa com outro cliente.
  const invalidRes = await client.call("/api/app/chats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId: client2.userId }),
  })
  check("cliente com cliente é bloqueado (403)", invalidRes.status === 403, invalidRes.status)

  // Conversa só aparece na lista quando tem mensagem: cliente2 nunca conversou.
  const client2List = (await (await client2.call("/api/app/chats")).json()) as { chats: unknown[] }
  check("cliente sem conversas tem lista vazia", client2List.chats.length === 0, client2List)

  // Limpeza.
  await prisma.user.delete({ where: { email: clientEmail } }).catch(() => {})
  await prisma.user.delete({ where: { email: client2Email } }).catch(() => {})
  await prisma.user.delete({ where: { email: proEmail } }).catch(() => {})

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  await prisma.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
