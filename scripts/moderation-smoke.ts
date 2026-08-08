// Smoke test de moderação (filtro de conteúdo, denúncia, ocultação e suspensão).
// Cria um cliente e um profissional descartáveis e exercita: filtro de texto
// ofensivo -> denúncia (validações e idempotência) -> ocultar mensagem -> conta
// suspensa -> reativação -> fechamento da denúncia.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/moderation-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"
import {
  dismissReport,
  hideContent,
  resolveReport,
  suspendUser,
  unsuspendUser,
} from "../apps/api/src/modules/moderation/actions"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `mod_client_${suffix}@example.com`
const proEmail = `mod_pro_${suffix}@example.com`
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

  const cookie = (signIn.headers.get("set-cookie") ?? "")
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")

  const call = (path: string, init: RequestInit = {}) =>
    req(path, ip, { ...init, headers: { cookie, ...init.headers } })

  const json = async (path: string, init?: RequestInit) => (await call(path, init)).json()

  const post = (path: string, body: unknown) =>
    call(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  return { call, json, post, userId: user!.id }
}

async function main() {
  const client = await signUpAndLogin(clientEmail, "CLIENT", "10.9.0.1")
  const pro = await signUpAndLogin(proEmail, "PROFESSIONAL", "10.9.0.2")

  // ---------- Filtro de conteúdo ofensivo ----------

  const chatRes = await client.post("/api/app/chats", { targetUserId: pro.userId })
  const { chat } = (await chatRes.json()) as { chat: { id: string } }
  const chatId = chat.id

  const offensive = await client.post(`/api/app/chats/${chatId}/messages`, {
    content: "seu OTARIO, nao volte mais",
  })
  const offensiveBody = (await offensive.json()) as { code?: string }
  check("mensagem ofensiva é rejeitada (400)", offensive.status === 400, offensive.status)
  check("código da rejeição é OFFENSIVE_CONTENT", offensiveBody.code === "OFFENSIVE_CONTENT", offensiveBody)

  const evasion = await client.post(`/api/app/chats/${chatId}/messages`, {
    content: "seu ot4rio",
  })
  check("leetspeak também é barrado (400)", evasion.status === 400, evasion.status)

  const clean = await client.post(`/api/app/chats/${chatId}/messages`, {
    content: "Bom dia! Preciso de um orcamento para pintura do quarto.",
  })
  check("mensagem legítima passa (201/200)", clean.ok, clean.status)

  const cleanBody = (await clean.json()) as { message: { id: string } }
  const messageId = cleanBody.message.id

  // O payload é completo de propósito: assim o Zod passa e quem barra é o filtro.
  // Os ids apontam para registros inexistentes — a checagem de categoria/cidade
  // vem depois do filtro, então o código de erro comprova a ordem correta.
  const offensiveRequest = await client.post("/api/app/service-requests", {
    categoryId: "00000000-0000-0000-0000-000000000000",
    cityId: "00000000-0000-0000-0000-000000000000",
    title: "Servico de pintura completa",
    description: "quem responder eh um babaca e nao sabe trabalhar direito",
    zipCode: "01001-000",
    street: "Rua das Flores",
    number: "120",
    neighborhood: "Centro",
    urgency: "FLEXIBLE",
  })
  const offensiveRequestBody = (await offensiveRequest.json()) as { code?: string }
  check(
    "solicitação com texto ofensivo é barrada antes da validação de categoria",
    offensiveRequest.status === 400 && offensiveRequestBody.code === "OFFENSIVE_CONTENT",
    offensiveRequestBody,
  )

  // ---------- Denúncia ----------

  const badReason = await pro.post("/api/app/reports", {
    targetType: "USER",
    targetId: client.userId,
    reason: "NAO_EXISTE",
  })
  check("motivo fora da lista é rejeitado (400)", badReason.status === 400, badReason.status)

  const otherNoDetails = await pro.post("/api/app/reports", {
    targetType: "USER",
    targetId: client.userId,
    reason: "OUTRO",
    details: "curto",
  })
  check("motivo OUTRO sem descrição é rejeitado (400)", otherNoDetails.status === 400, otherNoDetails.status)

  const selfReport = await pro.post("/api/app/reports", {
    targetType: "USER",
    targetId: pro.userId,
    reason: "SPAM",
  })
  check("denunciar a si mesmo é rejeitado (400)", selfReport.status === 400, selfReport.status)

  const missingTarget = await pro.post("/api/app/reports", {
    targetType: "MESSAGE",
    targetId: "00000000-0000-0000-0000-000000000000",
    reason: "SPAM",
  })
  check("alvo inexistente responde 404", missingTarget.status === 404, missingTarget.status)

  const ownContent = await client.post("/api/app/reports", {
    targetType: "MESSAGE",
    targetId: messageId,
    reason: "SPAM",
  })
  check("denunciar o próprio conteúdo é rejeitado (400)", ownContent.status === 400, ownContent.status)

  const report = await pro.post("/api/app/reports", {
    targetType: "MESSAGE",
    targetId: messageId,
    reason: "ASSEDIO",
    details: "Mensagem com tom agressivo.",
  })
  check("denúncia válida é aceita (201)", report.status === 201, report.status)

  const duplicate = await pro.post("/api/app/reports", {
    targetType: "MESSAGE",
    targetId: messageId,
    reason: "SPAM",
  })
  check("denúncia repetida responde sucesso (idempotente)", duplicate.status === 201, duplicate.status)

  const reportCount = await prisma.contentReport.count({
    where: { reporterId: pro.userId, targetType: "MESSAGE", targetId: messageId },
  })
  check("denúncia repetida não duplica o registro", reportCount === 1, reportCount)

  const stored = await prisma.contentReport.findFirstOrThrow({
    where: { reporterId: pro.userId, targetId: messageId },
    select: { id: true, reason: true, status: true },
  })
  check("denúncia nasce PENDING", stored.status === "PENDING", stored)
  check("motivo original é preservado na repetição", stored.reason === "ASSEDIO", stored)

  // ---------- Ocultação de conteúdo ----------

  const beforeHide = (await pro.json(`/api/app/chats/${chatId}/messages`)) as {
    messages: { id: string }[]
  }
  check("mensagem aparece antes de ocultar", beforeHide.messages.length === 1, beforeHide)

  const hidden = await hideContent("MESSAGE", messageId, "Teste de moderação.")
  check("ocultar a mensagem funciona", hidden.ok, hidden)

  const afterHide = (await pro.json(`/api/app/chats/${chatId}/messages`)) as {
    messages: { id: string }[]
  }
  check("mensagem ocultada some da conversa", afterHide.messages.length === 0, afterHide)

  const chatList = (await pro.json("/api/app/chats")) as {
    chats: unknown[]
    totalUnread: number
  }
  check("conversa sem mensagem visível sai da lista", chatList.chats.length === 0, chatList)
  check("não-lidas não contam mensagem ocultada", chatList.totalUnread === 0, chatList)

  const stillInDb = await prisma.message.findUnique({
    where: { id: messageId },
    select: { hiddenAt: true, hiddenReason: true },
  })
  check("mensagem ocultada é preservada no banco", stillInDb?.hiddenAt !== null, stillInDb)

  const hideUser = await hideContent("USER", client.userId, "x")
  check("ocultar USER é recusado (usuário se suspende)", !hideUser.ok, hideUser)

  // ---------- Suspensão ----------

  const suspended = await suspendUser(client.userId, "Conteúdo ofensivo reiterado.")
  check("suspender o usuário funciona", suspended.ok, suspended)

  const blockedRes = await client.call("/api/app/chats")
  const blockedBody = (await blockedRes.json()) as { code?: string; message?: string }
  check("usuário suspenso recebe 403", blockedRes.status === 403, blockedRes.status)
  check("código é ACCOUNT_SUSPENDED", blockedBody.code === "ACCOUNT_SUSPENDED", blockedBody)
  check(
    "motivo da suspensão chega ao app",
    blockedBody.message === "Conteúdo ofensivo reiterado.",
    blockedBody,
  )

  const reactivated = await unsuspendUser(client.userId)
  check("reativar o usuário funciona", reactivated.ok, reactivated)

  const afterUnsuspend = await client.call("/api/app/chats")
  check("acesso volta após reativação", afterUnsuspend.ok, afterUnsuspend.status)

  // ---------- Fechamento da denúncia ----------

  const resolved = await resolveReport(stored.id, "Mensagem ocultada e usuário avisado.")
  check("resolver a denúncia funciona", resolved.ok, resolved)

  const decidedTwice = await dismissReport(stored.id, "tentativa dupla")
  check("denúncia já decidida não pode ser decidida de novo", !decidedTwice.ok, decidedTwice)

  const closed = await prisma.contentReport.findUniqueOrThrow({
    where: { id: stored.id },
    select: { status: true, resolvedAt: true, resolutionNote: true },
  })
  check("status final é RESOLVED", closed.status === "RESOLVED", closed)
  check("data da decisão é gravada", closed.resolvedAt !== null, closed)
  check("nota da decisão é gravada", closed.resolutionNote !== null, closed)

  // Limpeza.
  await prisma.user.delete({ where: { email: clientEmail } }).catch(() => {})
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
