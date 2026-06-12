import type { Context, MiddlewareHandler, Next } from "hono"

import { publicSignUpSchema } from "./schemas"

const forbiddenPublicSignUpFields = new Set([
  "createdAt",
  "emailVerified",
  "id",
  "passwordHash",
  "updatedAt",
])

export const publicSignUpGuard: MiddlewareHandler = async (context: Context, next: Next) => {
  const path = new URL(context.req.url).pathname

  if (context.req.method !== "POST" || path !== "/api/auth/sign-up/email") {
    await next()
    return
  }

  const body = await context.req.raw.clone().json().catch(() => null)

  if (body && typeof body === "object" && "role" in body && body.role === "ADMIN") {
    return context.json(
      {
        code: "PUBLIC_ADMIN_SIGN_UP_BLOCKED",
        message: "Cadastro publico como ADMIN nao e permitido.",
      },
      403,
    )
  }

  if (
    body &&
    typeof body === "object" &&
    Object.keys(body).some((key) => forbiddenPublicSignUpFields.has(key))
  ) {
    return context.json(
      {
        code: "INVALID_SIGN_UP_DATA",
        message: "Dados de cadastro invalidos.",
      },
      400,
    )
  }

  const result = publicSignUpSchema.safeParse(body)

  if (!result.success) {
    return context.json(
      {
        code: "INVALID_SIGN_UP_DATA",
        message: "Dados de cadastro invalidos.",
      },
      400,
    )
  }

  await next()
}
