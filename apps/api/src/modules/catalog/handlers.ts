import { normalizeCityName, prisma } from "@santiago/database"
import { z } from "zod"

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
// MANTIDO como está: a APK do cliente já instalada consome este contrato (lista
// completa). A busca dinâmica vive no endpoint separado abaixo.
export async function listCitiesHandler(context: AuthedContext) {
  const cities = await prisma.city.findMany({
    select: { id: true, name: true, state: true },
    orderBy: [{ state: "asc" }, { name: "asc" }],
  })

  return context.json({ cities })
}

// Limite de resultados por busca: o seletor mostra as primeiras correspondências
// enquanto o usuário digita. Com ~5.570 municípios, um teto simples mantém a
// resposta pequena e rápida sem precisar de paginação por cursor nesta fase.
const CITY_SEARCH_LIMIT = 20

const citySearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
})

// Busca de cidades por texto (typeahead). Insensível a acento e caixa via coluna
// normalizada `searchName`, comparada com o termo normalizado do mesmo jeito.
// Termo vazio/curto retorna lista vazia (o app só busca a partir de 1+ caractere).
export async function listCitiesSearchHandler(context: AuthedContext) {
  const parsed = citySearchSchema.safeParse(context.req.query())

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_QUERY", message: parsed.error.issues[0]?.message ?? "Busca inválida." },
      400,
    )
  }

  const term = normalizeCityName(parsed.data.q ?? "")

  if (term.length === 0) {
    return context.json({ cities: [] })
  }

  const cities = await prisma.city.findMany({
    where: { searchName: { contains: term } },
    select: { id: true, name: true, state: true },
    orderBy: [{ name: "asc" }, { state: "asc" }],
    take: CITY_SEARCH_LIMIT,
  })

  return context.json({ cities })
}
