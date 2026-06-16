import { Hono } from "hono"

import { auth } from "./auth"
import { emailVerificationStatusHandler } from "./email-verification-status"

export const authRoutes = new Hono()

// Rota própria registrada antes do catch-all do better-auth.
authRoutes.get("/email-verification-status", emailVerificationStatusHandler)

authRoutes.on(["GET", "POST"], "/*", (context) => {
  return auth.handler(context.req.raw)
})
