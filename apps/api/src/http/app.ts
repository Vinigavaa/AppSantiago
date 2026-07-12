import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { corsOrigins } from "@/config/env"
import { authRateLimit } from "@/http/rate-limit"
import { landingPages } from "@/http/landing-pages"
import { appRoutes } from "@/modules/app-routes"
import { emailVerificationGuard } from "@/modules/auth/email-verification-guard"
import { publicSignUpGuard } from "@/modules/auth/public-sign-up-guard"
import { authRoutes } from "@/modules/auth/routes"

export const app = new Hono()

app.use("*", logger())

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return null
      }

      return corsOrigins.includes(origin) ? origin : null
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
)

app.get("/health", (context) => {
  return context.json({ ok: true })
})

// Rede de segurança: qualquer exceção não tratada em um handler vira uma resposta
// JSON no mesmo formato do resto da API ({ code, message }), nunca um corpo do
// framework ou um stack trace. O erro é registrado para diagnóstico no servidor.
app.onError((error, context) => {
  console.error("[api] erro não tratado", error)
  return context.json(
    { code: "INTERNAL", message: "Algo deu errado. Tente novamente em instantes." },
    500,
  )
})

// Rota inexistente também responde em JSON (o app espera sempre JSON).
app.notFound((context) => {
  return context.json({ code: "NOT_FOUND", message: "Recurso não encontrado." }, 404)
})

app.use("/api/auth/*", authRateLimit)
app.use("/api/auth/*", publicSignUpGuard)
app.use("/api/auth/*", emailVerificationGuard)
app.route("/api/auth", authRoutes)
app.route("/api/app", appRoutes)
app.route("/", landingPages)
