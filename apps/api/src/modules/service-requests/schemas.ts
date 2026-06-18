import { z } from "zod"

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
    neighborhood: z
      .string()
      .trim()
      .max(120, "O bairro pode ter no máximo 120 caracteres.")
      .optional(),
    urgency: z.enum(["URGENT", "THIS_WEEK", "FLEXIBLE"], {
      message: "Informe a urgência do serviço.",
    }),
    budgetMin: z.number().positive("Informe um valor válido.").max(9_999_999).optional(),
    budgetMax: z.number().positive("Informe um valor válido.").max(9_999_999).optional(),
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
