import { z } from "zod"

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Informe um username com pelo menos 3 caracteres.")
  .max(30, "O username deve ter no máximo 30 caracteres.")
  .regex(/^[a-zA-Z0-9_.]+$/, "Use apenas letras, números, ponto ou underline.")

export const signInSchema = z
  .object({
    username: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || z.email().safeParse(value).success, {
        message: "Informe um email válido.",
      }),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(128, "A senha deve ter no máximo 128 caracteres."),
  })
  .refine((data) => Boolean(data.username || data.email), {
    message: "Informe username ou email para entrar.",
    path: ["username"],
  })

export const signUpSchema = z.object({
  username: usernameSchema,
  email: z.email("Informe um email válido.").trim(),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "A senha deve ter no máximo 128 caracteres."),
  role: z.enum(["CLIENT", "PROFESSIONAL"], {
    error: "Selecione Cliente ou Profissional.",
  }),
})

export const forgotPasswordSchema = z.object({
  email: z.email("Informe um email válido.").trim(),
})

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Informe o token de redefinição."),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(128, "A senha deve ter no máximo 128 caracteres."),
    passwordConfirmation: z
      .string()
      .min(8, "A confirmação deve ter pelo menos 8 caracteres.")
      .max(128, "A confirmação deve ter no máximo 128 caracteres."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não conferem.",
    path: ["passwordConfirmation"],
  })

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
