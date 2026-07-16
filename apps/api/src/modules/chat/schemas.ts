import { z } from "zod"

// Abre (ou reutiliza) a conversa com outro usuário, identificado pelo seu id.
export const openChatSchema = z.object({
  targetUserId: z.uuid("Usuário inválido."),
})

// Envio de mensagem: texto, foto, ou foto com legenda. O limite de texto evita
// payloads abusivos. A foto já foi enviada à Cloudinary (upload assinado); aqui
// chega apenas a referência, e o backend confere que ela está na pasta do
// remetente antes de montar a URL.
export const sendMessageSchema = z
  .object({
    content: z.string().trim().max(2000, "Mensagem muito longa.").default(""),
    photo: z
      .object({
        publicId: z.string().min(1).max(300),
        version: z.coerce.number().int().positive(),
      })
      .optional(),
  })
  // Mensagem vazia não existe: precisa de texto ou de foto.
  .refine((data) => data.content.length > 0 || data.photo !== undefined, {
    message: "Digite uma mensagem ou anexe uma foto.",
  })
