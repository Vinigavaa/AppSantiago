import { z } from "zod"

// Abre (ou reutiliza) a conversa com outro usuário, identificado pelo seu id.
export const openChatSchema = z.object({
  targetUserId: z.uuid("Usuário inválido."),
})

// Envio de mensagem de texto. O limite evita payloads abusivos; anexos entram em
// um fluxo futuro (campo próprio no banco), sem alterar o envio de texto.
export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Digite uma mensagem.")
    .max(2000, "Mensagem muito longa."),
})
