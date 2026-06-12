import { config } from "dotenv"
import { resolve } from "node:path"
import { z } from "zod"

for (const envPath of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/api/.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../apps/api/.env"),
]) {
  config({ path: envPath, override: false })
}

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3333),
  APP_DEEP_LINK_SCHEME: z.string().default("santiago"),
  APP_WEB_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGIN: z.string().default("http://localhost:8081"),
  DATABASE_URL: z.string().min(1),
  EMAIL_FROM: z.string().min(3).default("Santiago <no-reply@santiago.local>"),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_REPLY_TO: z.email().optional(),
  RESEND_API_KEY: z.string().optional(),
})

export const env = envSchema.parse(process.env)

if (process.env.NODE_ENV === "production" && env.EMAIL_PROVIDER === "console") {
  throw new Error("EMAIL_PROVIDER=console is not allowed in production")
}

if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend")
}

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
