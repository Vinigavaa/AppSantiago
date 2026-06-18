import { prisma } from "@santiago/database"

import type { AuthedContext } from "@/modules/shared/require-auth"

// Categorias ativas para o seletor da criação de solicitação.
export async function listCategoriesHandler(context: AuthedContext) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })

  return context.json({ categories })
}

// Cidades atendidas, para o seletor de localização.
export async function listCitiesHandler(context: AuthedContext) {
  const cities = await prisma.city.findMany({
    select: { id: true, name: true, state: true },
    orderBy: [{ state: "asc" }, { name: "asc" }],
  })

  return context.json({ cities })
}
