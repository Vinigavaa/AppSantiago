import { prisma } from "@santiago/database"
import type { Context } from "hono"
import { z } from "zod"

const querySchema = z.object({
  email: z.email(),
})

// Consulta pública usada pela tela de verificação ("Já verifiquei meu email").
// Retorna apenas se o email está confirmado. Contas inexistentes respondem
// `verified: false` para não revelar se o email possui cadastro (anti-enumeração).
export async function emailVerificationStatusHandler(context: Context) {
  const parsed = querySchema.safeParse({
    email: context.req.query("email"),
  })

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_EMAIL", message: "Email invalido." },
      400,
    )
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    select: { emailVerified: true },
  })

  return context.json({ verified: user?.emailVerified ?? false })
}
