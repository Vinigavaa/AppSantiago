import { z } from "zod"

// Edição das informações pessoais do profissional. Campos opcionais aceitam null
// (ou vazio, normalizado no handler) para limpar o valor.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  displayName: z.string().trim().max(60).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  bio: z.string().trim().max(600).nullable().optional(),
  // Profissão livre (apresentação). Opcional; vazio limpa o campo.
  profession: z.string().trim().max(80).nullable().optional(),
})

export const setCategoriesSchema = z.object({
  categoryIds: z.array(z.uuid()).max(20),
})

export const setCitiesSchema = z.object({
  cityIds: z.array(z.uuid()).max(50),
})

export const categorySuggestionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com ao menos 2 caracteres.")
    .max(60, "O nome pode ter no máximo 60 caracteres."),
})
