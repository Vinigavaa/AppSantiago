import { z } from "zod"

// Edição das informações pessoais do cliente. O telefone é opcional e aceita
// vazio/null (normalizado no handler) para limpar o valor.
export const updateClientProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  phone: z.string().trim().max(20).nullable().optional(),
})
