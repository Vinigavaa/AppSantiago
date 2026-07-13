import { z } from "zod"

// Limite de fotos por solicitacao. Suficiente para ilustrar o servico sem pesar.
export const MAX_REQUEST_PHOTOS = 6

export const createServiceRequestSchema = z
  .object({
    categoryId: z.uuid({ message: "Selecione uma categoria." }),
    cityId: z.uuid({ message: "Selecione uma cidade." }),
    title: z
      .string()
      .trim()
      .min(5, "O título precisa ter ao menos 5 caracteres.")
      .max(120, "O título pode ter no máximo 120 caracteres."),
    description: z
      .string()
      .trim()
      .min(20, "Descreva o serviço com ao menos 20 caracteres.")
      .max(2000, "A descrição pode ter no máximo 2000 caracteres."),
    // Endereço completo: coletado na criação, mas só liberado ao profissional
    // contratado. A cidade/estado vêm de cityId; aqui ficam os campos finos.
    zipCode: z
      .string()
      .trim()
      .regex(/^\d{5}-?\d{3}$/, "Informe um CEP válido."),
    street: z
      .string()
      .trim()
      .min(3, "Informe a rua.")
      .max(160, "A rua pode ter no máximo 160 caracteres."),
    number: z
      .string()
      .trim()
      .min(1, "Informe o número.")
      .max(20, "O número pode ter no máximo 20 caracteres."),
    neighborhood: z
      .string()
      .trim()
      .min(2, "Informe o bairro.")
      .max(120, "O bairro pode ter no máximo 120 caracteres."),
    complement: z
      .string()
      .trim()
      .max(120, "O complemento pode ter no máximo 120 caracteres.")
      .optional(),
    urgency: z.enum(["URGENT", "THIS_WEEK", "FLEXIBLE"], {
      message: "Informe a urgência do serviço.",
    }),
    budgetMin: z.number().positive("Informe um valor válido.").max(9_999_999).optional(),
    budgetMax: z.number().positive("Informe um valor válido.").max(9_999_999).optional(),
    // Fotos recém-enviadas à Cloudinary (public_id + versão). O backend valida a
    // pasta e monta a URL. Na edição, keepPhotoIds diz quais fotos existentes ficam.
    photos: z
      .array(
        z.object({
          publicId: z.string().min(1).max(300),
          version: z.coerce.number().int().positive(),
        }),
      )
      .max(MAX_REQUEST_PHOTOS)
      .optional(),
    keepPhotoIds: z.array(z.uuid()).max(MAX_REQUEST_PHOTOS).optional(),
  })
  .refine(
    (data) =>
      data.budgetMin === undefined ||
      data.budgetMax === undefined ||
      data.budgetMax >= data.budgetMin,
    {
      message: "O valor máximo deve ser maior ou igual ao mínimo.",
      path: ["budgetMax"],
    },
  )

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>
