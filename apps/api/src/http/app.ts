import { Hono } from "hono"
import { cors } from "hono/cors"

import { corsOrigins } from "@/config/env"
import { authRateLimit } from "@/http/rate-limit"
import { landingPages } from "@/http/landing-pages"
import { emailVerificationGuard } from "@/modules/auth/email-verification-guard"
import { publicSignUpGuard } from "@/modules/auth/public-sign-up-guard"
import { authRoutes } from "@/modules/auth/routes"

export const app = new Hono()

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

app.use("/api/auth/*", authRateLimit)
app.use("/api/auth/*", publicSignUpGuard)
app.use("/api/auth/*", emailVerificationGuard)
app.route("/api/auth", authRoutes)
app.route("/", landingPages)
