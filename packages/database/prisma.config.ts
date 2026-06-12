import { config } from "dotenv"
import { resolve } from "node:path"
import { defineConfig, env } from "prisma/config"

for (const envPath of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/api/.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../apps/api/.env"),
]) {
  config({ path: envPath, override: false })
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
