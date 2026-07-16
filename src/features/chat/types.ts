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
  // `hasAttachment` permite a prévia mostrar "Foto" quando a mensagem não tem texto.
  lastMessage: {
    content: string
    hasAttachment: boolean
    mine: boolean
    createdAt: string
  } | null
  unreadCount: number
  updatedAt: string
}

// Estado de entrega de uma mensagem enviada localmente (envio otimista):
// "sending" enquanto vai ao servidor, "failed" se der erro. Mensagens vindas do
// servidor não têm status (ficam implicitamente entregues).
export type MessageStatus = "sending" | "sent" | "failed"

// Foto já enviada à Cloudinary, aguardando virar mensagem. Fica guardada na
// mensagem local para que um reenvio não precise subir a imagem de novo.
export type PendingPhoto = { publicId: string; version: number }

// Uma mensagem na visão de quem lê: `mine` diferencia enviada/recebida e `read`
// alimenta os recibos (entregue/lida). `attachmentUrl` é a foto anexada (URL do
// servidor, ou a local enquanto a mensagem ainda não foi confirmada).
// `status` e `pendingPhoto` só existem em mensagens locais ainda não confirmadas.
export type ChatMessage = {
  id: string
  content: string
  attachmentUrl: string | null
  mine: boolean
  read: boolean
  createdAt: string
  status?: MessageStatus
  pendingPhoto?: PendingPhoto
}
