// Espelho do contrato de eventos do servidor
// (`apps/api/src/modules/realtime/types.ts`). Qualquer mudança lá precisa ser
// refletida aqui.

import type { ChatMessage } from "@/features/chat/types"
import type { BadgeArea } from "@/features/notifications/badges-types"
import type { NotificationType } from "@/features/notifications/types"

// Notificação pronta para exibir. A `area` vem resolvida pelo servidor, que
// conhece o perfil de quem recebe — o app não recalcula nem reescreve os textos.
export type RealtimeNotification = {
  id: string
  type: NotificationType
  area: BadgeArea
  title: string
  message: string
}

export type RealtimeEvent =
  // Mensagem nova de outra pessoa. Já vem na perspectiva de quem recebe
  // (`mine: false`), pronta para entrar na conversa sem nenhuma consulta.
  // `senderName` alimenta o aviso exibido quando a conversa não está aberta.
  | { type: "message:new"; chatId: string; senderName: string; message: ChatMessage }
  // Notificação nova: acende o indicador da aba e dispara o aviso na hora.
  | { type: "notification:new"; notification: RealtimeNotification }
  // Mensagens enviadas por este usuário que acabaram de ser lidas.
  | { type: "message:read"; chatId: string; messageIds: string[] }
  // Mensagem excluída pelo remetente antes de ser lida.
  | { type: "message:deleted"; chatId: string; messageId: string }
  // Resposta ao heartbeat, tratada dentro do cliente e nunca repassada às telas.
  | { type: "pong" }

export type RealtimeEventType = RealtimeEvent["type"]
