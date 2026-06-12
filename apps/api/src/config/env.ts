import { config } from "dotenv"
import { resolve } from "node:path"
import { z } from "zod"

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  config({ path: envPath, override: false })
}

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3333),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGIN: z.string().default("http://localhost:8081"),
  DATABASE_URL: z.string().min(1),
})

export const env = envSchema.parse(process.env)

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
