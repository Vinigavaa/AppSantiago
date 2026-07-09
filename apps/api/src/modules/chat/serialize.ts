// Formato de dados do chat exposto ao app. Uma conversa é sempre entre um cliente
// e um profissional; para cada usuário, o "outro" participante é o oposto do par.

// Seleção dos participantes de uma conversa, com identidade suficiente para o
// cabeçalho e para abrir o perfil completo da outra pessoa.
export const chatParticipantsSelect = {
  id: true,
  clientId: true,
  professionalId: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      user: { select: { id: true, name: true, displayUsername: true, avatarUrl: true } },
    },
  },
  professional: {
    select: {
      id: true,
      user: { select: { id: true, name: true, displayUsername: true, avatarUrl: true } },
    },
  },
} as const

type ChatParticipants = {
  id: string
  clientId: string
  professionalId: string
  updatedAt: Date
  client: { id: string; user: ChatUser }
  professional: { id: string; user: ChatUser }
}

type ChatUser = {
  id: string
  name: string
  displayUsername: string | null
  avatarUrl: string | null
}

export type OtherParticipant = {
  userId: string
  name: string
  avatarUrl: string | null
  role: "CLIENT" | "PROFESSIONAL"
  // Id do perfil (profissional ou cliente) para abrir o perfil completo no app.
  profileId: string
}

// A partir do usuário autenticado, resolve quem é o "outro" lado da conversa.
export function otherParticipant(chat: ChatParticipants, meUserId: string): OtherParticipant {
  const iAmClient = chat.client.user.id === meUserId

  if (iAmClient) {
    return {
      userId: chat.professional.user.id,
      name: chat.professional.user.displayUsername ?? chat.professional.user.name,
      avatarUrl: chat.professional.user.avatarUrl,
      role: "PROFESSIONAL",
      profileId: chat.professional.id,
    }
  }

  return {
    userId: chat.client.user.id,
    name: chat.client.user.displayUsername ?? chat.client.user.name,
    avatarUrl: chat.client.user.avatarUrl,
    role: "CLIENT",
    profileId: chat.client.id,
  }
}

type MessageRow = {
  id: string
  senderId: string
  content: string
  attachmentUrl: string | null
  readAt: Date | null
  createdAt: Date
}

export const messageSelect = {
  id: true,
  senderId: true,
  content: true,
  attachmentUrl: true,
  readAt: true,
  createdAt: true,
} as const

// Uma mensagem na visão de quem está lendo: `mine` diferencia enviada/recebida e
// `read` alimenta os recibos (entregue/lida).
export function serializeMessage(message: MessageRow, meUserId: string) {
  return {
    id: message.id,
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    mine: message.senderId === meUserId,
    read: message.readAt !== null,
    createdAt: message.createdAt.toISOString(),
  }
}

type LastMessage = { content: string; attachmentUrl: string | null; senderId: string; createdAt: Date }

// Resumo de uma conversa para a lista principal (foto, nome, prévia, horário e
// não-lidas).
export function serializeChatSummary(
  chat: ChatParticipants & { messages: LastMessage[] },
  meUserId: string,
  unreadCount: number,
) {
  const last = chat.messages[0]

  return {
    id: chat.id,
    otherUser: otherParticipant(chat, meUserId),
    lastMessage: last
      ? {
          content: last.content,
          mine: last.senderId === meUserId,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
    unreadCount,
    updatedAt: chat.updatedAt.toISOString(),
  }
}
