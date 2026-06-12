import type { Context, MiddlewareHandler, Next } from "hono"

import { findEmailVerificationToken } from "./email-verification-tokens"

function failResponse(context: Context, code: string, message: string) {
  const url = new URL(context.req.url)
  const callbackURL = url.searchParams.get("callbackURL")

  if (callbackURL) {
    const separator = callbackURL.includes("?") ? "&" : "?"
    return context.redirect(`${callbackURL}${separator}error=${encodeURIComponent(code)}`)
  }

  return context.json({ code, message }, 400)
}

export const emailVerificationGuard: MiddlewareHandler = async (context: Context, next: Next) => {
  const url = new URL(context.req.url)

  if (context.req.method !== "GET" || url.pathname !== "/api/auth/verify-email") {
    await next()
    return
  }

  const token = url.searchParams.get("token")

  if (!token) {
    return failResponse(
      context,
      "INVALID_TOKEN",
      "Token de verificacao invalido.",
    )
  }

  const verification = await findEmailVerificationToken(token)

  if (!verification) {
    return failResponse(
      context,
      "INVALID_TOKEN",
      "Token de verificacao invalido ou expirado.",
    )
  }

  await next()
}
