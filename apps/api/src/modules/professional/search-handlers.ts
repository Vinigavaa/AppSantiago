import { type Prisma, prisma } from "@santiago/database"
import { z } from "zod"

import { getBlockedUserIds } from "@/modules/blocks/service"
import type { AuthedContext } from "@/modules/shared/require-auth"

// Limite de resultados por busca. O marketplace é pequeno; um teto simples evita
// respostas gigantes sem precisar de paginação nesta fase.
const RESULTS_LIMIT = 50

const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.uuid().optional(),
  cityId: z.uuid().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["rating", "reviews", "experience", "recent"]).optional(),
})

type SortKey = z.infer<typeof searchQuerySchema>["sort"]

// Ordenação no banco a partir de colunas reais. "experience" usa o campo de anos
// de experiência (nulos por último); "recent" usa a data de cadastro do perfil.
function orderByFor(sort: SortKey): Prisma.ProfessionalProfileOrderByWithRelationInput[] {
  switch (sort) {
    case "reviews":
      return [{ ratingCount: "desc" }, { ratingAverage: "desc" }]
    case "experience":
      return [{ experience: { sort: "desc", nulls: "last" } }, { ratingAverage: "desc" }]
    case "recent":
      return [{ createdAt: "desc" }]
    default:
      return [{ ratingAverage: "desc" }, { ratingCount: "desc" }]
  }
}

// Busca de profissionais para o cliente descobrir prestadores. Usa apenas dados
// reais: só perfis disponíveis, respeitando bloqueios, filtros e ordenação. Não
// expõe dados de contato — o detalhe fica no perfil público.
export async function searchProfessionalsHandler(context: AuthedContext) {
  const user = context.get("user")

  const parsed = searchQuerySchema.safeParse(context.req.query())

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_QUERY", message: parsed.error.issues[0]?.message ?? "Filtros inválidos." },
      400,
    )
  }

  const { q, categoryId, cityId, minRating, sort } = parsed.data

  // Profissionais bloqueados (em qualquer direção) não aparecem na busca.
  const blockedUserIds = await getBlockedUserIds(user.id)

  const where: Prisma.ProfessionalProfileWhereInput = {
    isAvailable: true,
    user: { id: { notIn: blockedUserIds } },
    // Só perfis com ao menos uma categoria definida: evita expor cadastros
    // incompletos e transmite mais confiança na descoberta.
    categories: { some: {} },
    ...(minRating ? { ratingAverage: { gte: minRating } } : {}),
    ...(categoryId ? { categories: { some: { categoryId } } } : {}),
    ...(cityId ? { cities: { some: { cityId } } } : {}),
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { displayUsername: { contains: q, mode: "insensitive" } } },
            { bio: { contains: q, mode: "insensitive" } },
            { categories: { some: { category: { name: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  }

  const profiles = await prisma.professionalProfile.findMany({
    where,
    orderBy: orderByFor(sort),
    take: RESULTS_LIMIT,
    select: {
      id: true,
      bio: true,
      experience: true,
      ratingAverage: true,
      ratingCount: true,
      user: { select: { id: true, name: true, displayUsername: true, avatarUrl: true } },
      categories: {
        select: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      cities: {
        select: { city: { select: { id: true, name: true, state: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  // Serviços concluídos por profissional (número real), em uma única agregação.
  const completedByProfile = new Map<string, number>()

  if (profiles.length > 0) {
    const grouped = await prisma.serviceContract.groupBy({
      by: ["professionalId"],
      where: { professionalId: { in: profiles.map((profile) => profile.id) }, status: "COMPLETED" },
      _count: { _all: true },
    })

    for (const row of grouped) {
      completedByProfile.set(row.professionalId, row._count._all)
    }
  }

  const professionals = profiles.map((profile) => {
    const categories = profile.categories.map((item) => item.category)

    return {
      id: profile.id,
      userId: profile.user.id,
      name: profile.user.displayUsername ?? profile.user.name,
      avatarUrl: profile.user.avatarUrl,
      bio: profile.bio,
      mainCategory: categories[0]?.name ?? null,
      categories,
      cities: profile.cities.map((item) => item.city),
      ratingAverage: Number(profile.ratingAverage),
      ratingCount: profile.ratingCount,
      servicesCompleted: completedByProfile.get(profile.id) ?? 0,
      experience: profile.experience,
    }
  })

  return context.json({ professionals })
}
