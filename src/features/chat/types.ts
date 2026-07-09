// A outra pessoa de uma conversa. `role`/`profileId` permitem abrir o perfil
// completo dela (profissional ou cliente) a partir do chat.
export type ChatOtherUser = {
  userId: string
  name: string
  avatarUrl: string | null
  role: "CLIENT" | "PROFESSIONAL"
  profileId: string
}

// Resumo de uma conversa para a lista principal.
export type ChatSummary = {
  id: string
  otherUser: ChatOtherUser
  lastMessage: { content: string; mine: boolean; createdAt: string } | null
  unreadCount: number
  updatedAt: string
}

// Uma mensagem na visão de quem lê: `mine` diferencia enviada/recebida e `read`
// alimenta os recibos (entregue/lida). `attachmentUrl` fica pronto para anexos.
export type ChatMessage = {
  id: string
  content: string
  attachmentUrl: string | null
  mine: boolean
  read: boolean
  createdAt: string
}
