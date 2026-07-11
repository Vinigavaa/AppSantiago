import { appFetch, type ApiResult } from "@/lib/api-client"

import type { ChatMessage, ChatOtherUser, ChatSummary } from "./types"

// Abre (ou reutiliza) a conversa com outro usuário, identificado pelo seu id.
export async function openChat(
  targetUserId: string,
): Promise<ApiResult<{ id: string; otherUser: ChatOtherUser }>> {
  const result = await appFetch<{ chat: { id: string; otherUser: ChatOtherUser } }>("/chats", {
    method: "POST",
    body: { targetUserId },
  })
  return result.ok ? { ok: true, data: result.data.chat } : result
}

// Conversas do usuário (só as que têm mensagens), com prévia e não-lidas.
export async function fetchChats(): Promise<
  ApiResult<{ chats: ChatSummary[]; totalUnread: number }>
> {
  return appFetch<{ chats: ChatSummary[]; totalUnread: number }>("/chats")
}

// Histórico da conversa em ordem cronológica. Abrir marca as recebidas como lidas.
export async function fetchMessages(
  chatId: string,
): Promise<ApiResult<{ otherUser: ChatOtherUser; messages: ChatMessage[] }>> {
  return appFetch<{ otherUser: ChatOtherUser; messages: ChatMessage[] }>(
    `/chats/${chatId}/messages`,
  )
}

export async function sendMessage(
  chatId: string,
  content: string,
): Promise<ApiResult<ChatMessage>> {
  const result = await appFetch<{ message: ChatMessage }>(`/chats/${chatId}/messages`, {
    method: "POST",
    body: { content },
  })
  return result.ok ? { ok: true, data: result.data.message } : result
}

// Exclui uma mensagem enviada (permitido apenas enquanto não foi lida). Falha com
// 409 se o destinatário já a visualizou.
export async function deleteMessage(
  chatId: string,
  messageId: string,
): Promise<ApiResult<void>> {
  const result = await appFetch<{ deleted: boolean }>(
    `/chats/${chatId}/messages/${messageId}`,
    { method: "DELETE" },
  )
  return result.ok ? { ok: true, data: undefined } : result
}
