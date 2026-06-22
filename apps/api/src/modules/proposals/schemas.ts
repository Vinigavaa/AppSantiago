import { z } from "zod"

// Mesmo caractere repetido 8+ vezes seguidas: sinal clássico de spam/teclado.
const REPEATED_RUN = /(.)\1{7,}/

// Prazos estimados aceitos (em dias). Espelham as opções oferecidas no app:
// Hoje (0), 1 dia, 2 dias, 3 dias e Esta semana (7).
export const ALLOWED_ESTIMATED_DAYS = [0, 1, 2, 3, 7] as const

// Envio de proposta para uma solicitação. Valores e mensagem são validados aqui
// (nunca confiar no app): faixa de preço, tamanho da mensagem e anti-spam básico.
export const createProposalSchema = z.object({
  serviceRequestId: z.uuid("Solicitação inválida."),
  price: z
    .number({ message: "Informe o valor da proposta." })
    .min(1, "O valor deve ser maior que zero.")
    .max(1_000_000, "Valor acima do permitido."),
  message: z
    .string()
    .trim()
    .min(10, "Escreva uma mensagem com pelo menos 10 caracteres.")
    .max(1000, "Mensagem muito longa (máx. 1000 caracteres).")
    .refine((value) => !REPEATED_RUN.test(value), "Mensagem inválida. Evite repetições.")
    .refine(
      (value) => new Set(value.replace(/\s/g, "")).size >= 3,
      "Mensagem inválida. Descreva melhor sua proposta.",
    ),
  estimatedDays: z
    .number()
    .int()
    .refine(
      (value) => (ALLOWED_ESTIMATED_DAYS as readonly number[]).includes(value),
      "Prazo inválido.",
    )
    .nullable()
    .optional(),
})
