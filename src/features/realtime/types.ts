// Espelho do contrato de eventos do servidor
// (`apps/api/src/modules/realtime/types.ts`). Qualquer mudança lá precisa ser
// refletida aqui.

import type { ChatMessage } from "@/features/chat/types"

export type RealtimeEvent =
  // Mensagem nova de outra pessoa. Já vem na perspectiva de quem recebe
  // (`mine: false`), pronta para entrar na conversa sem nenhuma consulta.
  | { type: "message:new"; chatId: string; message: ChatMessage }
  // Mensagens enviadas por este usuário que acabaram de ser lidas.
  | { type: "message:read"; chatId: string; messageIds: string[] }
  // Mensagem excluída pelo remetente antes de ser lida.
  | { type: "message:deleted"; chatId: string; messageId: string }
  // Resposta ao heartbeat, tratada dentro do cliente e nunca repassada às telas.
  | { type: "pong" }

export type RealtimeEventType = RealtimeEvent["type"]
