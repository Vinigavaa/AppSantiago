import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config } from "dotenv"
import { resolve } from "node:path"

for (const envPath of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/api/.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../apps/api/.env"),
]) {
  config({ path: envPath, override: false })
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured")
}

const adapter = new PrismaPg({ connectionString })

// Reexporta o namespace Prisma para os handlers tiparem where/orderBy/etc.
export { Prisma }

// Util de normalização de nomes de cidade (busca sem acento/caixa), compartilhado
// entre a carga (seed) e os handlers de busca da API.
export { normalizeCityName } from "./normalize"

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
