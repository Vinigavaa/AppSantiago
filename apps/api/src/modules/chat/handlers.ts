import { prisma } from "@santiago/database"
import { z } from "zod"

import { getBlockedUserIds, isBlockedBetween } from "@/modules/blocks/service"
import { sendPushToUser } from "@/modules/notifications/push"
import { getOrCreateProfessionalProfileId } from "@/modules/professional/professional-context"
import { getOrCreateClientProfileId } from "@/modules/service-requests/client-profile"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { openChatSchema, sendMessageSchema } from "./schemas"
import {
  chatParticipantsSelect,
  messageSelect,
  otherParticipant,
  serializeChatSummary,
  serializeMessage,
} from "./serialize"

const idSchema = z.uuid()

function forbidden(context: AuthedContext, message: string) {
  return context.json({ code: "FORBIDDEN", message }, 403)
}

function invalidData(context: AuthedContext, message: string) {
  return context.json({ code: "INVALID_DATA", message }, 400)
}

function chatNotFound(context: AuthedContext) {
  return context.json({ code: "NOT_FOUND", message: "Conversa não encontrada." }, 404)
}

// Só o primeiro nome, para uma prévia de notificação curta e sem sobrenome.
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

// Resolve o par cliente/profissional entre o usuário atual e o alvo. O chat é
// sempre entre um cliente e um profissional; qualquer outra combinação é inválida.
async function resolvePair(
  currentUser: { id: string; role: string },
  targetUserId: string,
): Promise<
  | { ok: true; clientId: string; professionalId: string }
  | { ok: false; message: string }
> {
  if (targetUserId === currentUser.id) {
    return { ok: false, message: "Você não pode iniciar uma conversa consigo mesmo." }
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  })

  if (!target) {
    return { ok: false, message: "Usuário não encontrado." }
  }

  if (await isBlockedBetween(currentUser.id, target.id)) {
    return { ok: false, message: "Conversa indisponível." }
  }

  const roles = [currentUser.role, target.role]
  const isValidPair = roles.includes("CLIENT") && roles.includes("PROFESSIONAL")

  if (!isValidPair) {
    return { ok: false, message: "A conversa é sempre entre um cliente e um profissional." }
  }

  const clientUserId = currentUser.role === "CLIENT" ? currentUser.id : target.id
  const professionalUserId = currentUser.role === "PROFESSIONAL" ? currentUser.id : target.id

  const [clientId, professionalId] = await Promise.all([
    getOrCreateClientProfileId(clientUserId),
    getOrCreateProfessionalProfileId(professionalUserId),
  ])

  return { ok: true, clientId, professionalId }
}

// Carrega uma conversa garantindo que o usuário autenticado participa dela.
async function loadAuthorizedChat(chatId: string | undefined, userId: string) {
  const parsedId = idSchema.safeParse(chatId)

  if (!parsedId.success) {
    return null
  }

  const chat = await prisma.chat.findUnique({
    where: { id: parsedId.data },
    select: chatParticipantsSelect,
  })

  if (!chat) {
    return null
  }

  const isParticipant = chat.client.user.id === userId || chat.professional.user.id === userId

  return isParticipant ? chat : null
}

// Abre a conversa com outro usuário. Se já existir uma entre os dois, ela é
// reutilizada (mantendo o histórico); caso contrário, é criada na hora.
export async function openChatHandler(context: AuthedContext) {
  const user = context.get("user")

  const body = await context.req.json().catch(() => null)
  const parsed = openChatSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const pair = await resolvePair(user, parsed.data.targetUserId)

  if (!pair.ok) {
    return forbidden(context, pair.message)
  }

  const chat = await prisma.chat.upsert({
    where: {
      clientId_professionalId: { clientId: pair.clientId, professionalId: pair.professionalId },
    },
    update: {},
    create: { clientId: pair.clientId, professionalId: pair.professionalId },
    select: chatParticipantsSelect,
  })

  return context.json({ chat: { id: chat.id, otherUser: otherParticipant(chat, user.id) } })
}

// Lista as conversas do usuário (apenas as que já têm mensagens), com o outro
// participante, a prévia da última mensagem e a contagem de não-lidas.
export async function listChatsHandler(context: AuthedContext) {
  const user = context.get("user")

  // Oculta conversas com quem foi bloqueado (em qualquer direção). Como um dos
  // lados do par é sempre o próprio usuário, filtrar pelos dois papéis exclui
  // exatamente as conversas cujo "outro" participante está bloqueado.
  const blockedUserIds = await getBlockedUserIds(user.id)

  const chats = await prisma.chat.findMany({
    where: {
      messages: { some: {} },
      OR: [{ client: { userId: user.id } }, { professional: { userId: user.id } }],
      NOT: [
        { client: { userId: { in: blockedUserIds } } },
        { professional: { userId: { in: blockedUserIds } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      ...chatParticipantsSelect,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, attachmentUrl: true, senderId: true, createdAt: true },
      },
    },
  })

  // Não-lidas por conversa: mensagens recebidas (de outra pessoa) ainda sem leitura.
  const unreadByChat = new Map<string, number>()

  if (chats.length > 0) {
    const grouped = await prisma.message.groupBy({
      by: ["chatId"],
      where: {
        chatId: { in: chats.map((chat) => chat.id) },
        readAt: null,
        senderId: { not: user.id },
      },
      _count: { _all: true },
    })

    for (const row of grouped) {
      unreadByChat.set(row.chatId, row._count._all)
    }
  }

  const totalUnread = [...unreadByChat.values()].reduce((sum, count) => sum + count, 0)

  return context.json({
    chats: chats.map((chat) => serializeChatSummary(chat, user.id, unreadByChat.get(chat.id) ?? 0)),
    totalUnread,
  })
}

// Abre uma conversa: retorna o histórico em ordem cronológica e marca como lidas
// as mensagens recebidas (o remetente passa a ver o recibo de leitura).
export async function listMessagesHandler(context: AuthedContext) {
  const user = context.get("user")
  const chatId = context.req.param("id")

  const chat = await loadAuthorizedChat(chatId, user.id)

  if (!chat) {
    return chatNotFound(context)
  }

  // Conversa bloqueada fica indisponível como se não existisse (mesmo 404).
  if (await isBlockedBetween(user.id, otherParticipant(chat, user.id).userId)) {
    return chatNotFound(context)
  }

  await prisma.message.updateMany({
    where: { chatId: chat.id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  })

  const messages = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  })

  return context.json({
    otherUser: otherParticipant(chat, user.id),
    messages: messages.map((message) => serializeMessage(message, user.id)),
  })
}

// Envia uma mensagem de texto na conversa e notifica o destinatário.
export async function sendMessageHandler(context: AuthedContext) {
  const user = context.get("user")
  const chatId = context.req.param("id")

  const chat = await loadAuthorizedChat(chatId, user.id)

  if (!chat) {
    return chatNotFound(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = sendMessageSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const recipient = otherParticipant(chat, user.id)

  // Não é possível enviar mensagem para quem foi bloqueado (em qualquer direção).
  if (await isBlockedBetween(user.id, recipient.userId)) {
    return forbidden(context, "Conversa indisponível.")
  }

  // Cria a mensagem e "sobe" a conversa (updatedAt) para ordenar a lista.
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { chatId: chat.id, senderId: user.id, content: parsed.data.content },
      select: messageSelect,
    }),
    prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }),
  ])

  const preview = `${firstName(user.name)}: ${parsed.data.content}`.slice(0, 120)

  await prisma.notification
    .create({
      data: {
        userId: recipient.userId,
        type: "MESSAGE_RECEIVED",
        title: "Nova mensagem",
        message: preview,
      },
    })
    .catch((error) => {
      // A notificação é complementar; nunca deve derrubar o envio da mensagem.
      console.error("[chat] falha ao criar notificação", error)
    })

  void sendPushToUser(recipient.userId, "Nova mensagem", preview)

  return context.json({ message: serializeMessage(message, user.id) }, 201)
}

// Exclui uma mensagem enviada, apenas enquanto o destinatário ainda não a leu.
// A remoção é definitiva e some para os dois lados. Só o remetente pode excluir.
export async function deleteMessageHandler(context: AuthedContext) {
  const user = context.get("user")
  const chatId = context.req.param("id")
  const messageId = context.req.param("messageId")

  const chat = await loadAuthorizedChat(chatId, user.id)

  if (!chat) {
    return chatNotFound(context)
  }

  if (!idSchema.safeParse(messageId).success) {
    return context.json({ code: "NOT_FOUND", message: "Mensagem não encontrada." }, 404)
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, chatId: true, senderId: true, readAt: true },
  })

  // Mensagem inexistente, de outra conversa ou de outra pessoa: trata como
  // inexistente (não revela mensagens que não pertencem ao usuário).
  if (!message || message.chatId !== chat.id || message.senderId !== user.id) {
    return context.json({ code: "NOT_FOUND", message: "Mensagem não encontrada." }, 404)
  }

  if (message.readAt !== null) {
    return context.json(
      { code: "ALREADY_READ", message: "Não é mais possível excluir: a mensagem já foi lida." },
      409,
    )
  }

  // Exclusão condicionada a `readAt: null` de forma atômica: se a outra pessoa
  // marcou como lida entre a verificação acima e aqui, o delete não afeta nada e
  // respondemos que já não é possível excluir.
  const deleted = await prisma.message.deleteMany({
    where: { id: message.id, senderId: user.id, readAt: null },
  })

  if (deleted.count === 0) {
    return context.json(
      { code: "ALREADY_READ", message: "Não é mais possível excluir: a mensagem já foi lida." },
      409,
    )
  }

  return context.json({ deleted: true })
}
