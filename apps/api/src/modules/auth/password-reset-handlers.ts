import type { Context } from "hono"
import { z } from "zod"

import { auth } from "./auth"
import { runWithPasswordResetContext } from "./password-reset-context"
import {
  consumeConfirmedPasswordResetRequest,
  generateSecret,
} from "./password-reset-requests"

const requestSchema = z.object({
  email: z.email(),
})

const statusSchema = z.object({
  requestId: z.string().min(1),
})

// Inicia a redefinicao. Responde sempre 200 com um requestId, mesmo para email
// sem cadastro, para nao revelar quais emails possuem conta (anti-enumeracao).
// O requestId e o segredo que autoriza o app a buscar o token depois: ele so
// existe no aparelho que iniciou o fluxo.
export async function passwordResetRequestHandler(context: Context) {
  const body = await context.req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return context.json({ code: "INVALID_EMAIL", message: "Email invalido." }, 400)
  }

  const requestId = generateSecret()
  const confirmationToken = generateSecret()

  try {
    await runWithPasswordResetContext({ requestId, confirmationToken }, async () => {
      await auth.api.requestPasswordReset({
        body: { email: parsed.data.email },
      })
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "password_reset_request_failed",
        reason: error instanceof Error ? error.message : "erro desconhecido",
      }),
    )

    return context.json(
      {
        code: "PASSWORD_RESET_UNAVAILABLE",
        message: "Nao foi possivel iniciar a redefinicao agora.",
      },
      503,
    )
  }

  return context.json({ requestId })
}

// Consultado pelo botao "Ja verifiquei meu email". Devolve o token apenas se o
// link do email ja foi aberto; a solicitacao e consumida na entrega.
export async function passwordResetStatusHandler(context: Context) {
  const parsed = statusSchema.safeParse({
    requestId: context.req.query("requestId"),
  })

  if (!parsed.success) {
    return context.json({ confirmed: false })
  }

  const token = await consumeConfirmedPasswordResetRequest(parsed.data.requestId)

  if (!token) {
    return context.json({ confirmed: false })
  }

  return context.json({ confirmed: true, token })
}
