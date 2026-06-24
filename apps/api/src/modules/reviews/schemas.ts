import { z } from "zod"

// Avaliação do cliente após o serviço concluído: nota de 1 a 5 e comentário opcional.
export const createReviewSchema = z.object({
  serviceContractId: z.uuid({ message: "Serviço inválido." }),
  rating: z
    .number({ message: "Informe a nota." })
    .int("A nota deve ser um número inteiro.")
    .min(1, "A nota mínima é 1.")
    .max(5, "A nota máxima é 5."),
  comment: z
    .string()
    .trim()
    .max(1000, "O comentário pode ter no máximo 1000 caracteres.")
    .optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
