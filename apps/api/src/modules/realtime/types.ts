// Contrato dos eventos que o servidor empurra pela conexão WebSocket. É a fonte
// única do formato: o espelho no app vive em `src/features/realtime/types.ts` e
// precisa acompanhar qualquer mudança feita aqui.
//
// O canal é servidor → app. O app só envia "ping" (heartbeat); nada do que ele
// manda define identidade ou conversa.

// Mensagem já serializada na perspectiva de quem recebe o evento — mesmo formato
// devolvido pelas rotas REST do chat, para o app inserir na tela sem consultar
// nada. Espelha o retorno de `serializeMessage`.
export type RealtimeMessage = {
  id: string
  content: string
  attachmentUrl: string | null
  mine: boolean
  read: boolean
  createdAt: string
}

export type RealtimeEvent =
  // Mensagem nova, entregue ao destinatário (nunca ao remetente: a tela dele já
  // exibe a mensagem pelo envio otimista).
  | { type: "message:new"; chatId: string; message: RealtimeMessage }
  // Recibo de leitura, entregue a quem enviou as mensagens que foram lidas.
  | { type: "message:read"; chatId: string; messageIds: string[] }
  // Exclusão de mensagem ainda não lida, entregue ao outro participante.
  | { type: "message:deleted"; chatId: string; messageId: string }
  // Resposta ao heartbeat do app.
  | { type: "pong" }
