import { Hono } from "hono"
import { cors } from "hono/cors"

import { corsOrigins } from "@/config/env"
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

app.route("/api/auth", authRoutes)
