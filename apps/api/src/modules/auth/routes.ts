import { Hono } from "hono"

import { auth } from "./auth"
import { emailVerificationStatusHandler } from "./email-verification-status"
import {
  passwordResetRequestHandler,
  passwordResetStatusHandler,
} from "./password-reset-handlers"

export const authRoutes = new Hono()

// Rotas próprias registradas antes do catch-all do better-auth.
authRoutes.get("/email-verification-status", emailVerificationStatusHandler)
authRoutes.post("/password-reset-request", passwordResetRequestHandler)
authRoutes.get("/password-reset-status", passwordResetStatusHandler)

authRoutes.on(["GET", "POST"], "/*", (context) => {
  return auth.handler(context.req.raw)
})
