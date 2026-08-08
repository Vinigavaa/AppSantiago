import { prisma } from "@santiago/database"

import { offensiveTextResponse } from "@/modules/moderation/text-filter"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { getProfessionalProfilePayload } from "./profile-data"
import { getOrCreateProfessionalProfileId } from "./professional-context"
import {
  categorySuggestionSchema,
  setCategoriesSchema,
  setCitiesSchema,
  updateProfileSchema,
} from "./schemas"

function forbidden(context: AuthedContext) {
  return context.json(
    { code: "FORBIDDEN", message: "Disponível apenas para profissionais." },
    403,
  )
}

function invalidData(context: AuthedContext, message: string) {
  return context.json({ code: "INVALID_DATA", message }, 400)
}

// Normaliza texto opcional: vazio vira null (limpa o campo).
function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function professionalProfileHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  await getOrCreateProfessionalProfileId(user.id)

  return context.json({ profile: await getProfessionalProfilePayload(user) })
}

export async function updateProfessionalProfileHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const { name } = parsed.data
  const displayName = normalizeOptional(parsed.data.displayName)
  const bio = normalizeOptional(parsed.data.bio)
  const profession = normalizeOptional(parsed.data.profession)

  const offensive = offensiveTextResponse(context, "professional-profile:update", user.id, [
    name,
    displayName,
    bio,
    profession,
  ])

  if (offensive) {
    return offensive
  }

  let phone: string | null = null
  const rawPhone = normalizeOptional(parsed.data.phone)

  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, "")

    if (digits.length < 10 || digits.length > 11) {
      return invalidData(context, "Telefone inválido. Use DDD + número.")
    }

    phone = digits
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim(), displayUsername: displayName, phone },
    }),
    prisma.professionalProfile.update({ where: { id: professionalId }, data: { bio, profession } }),
  ])

  return context.json({ profile: await getProfessionalProfilePayload(user) })
}

export async function setProfessionalCategoriesHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = setCategoriesSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Categorias inválidas.")
  }

  const categoryIds = [...new Set(parsed.data.categoryIds)]

  if (categoryIds.length > 0) {
    const valid = await prisma.category.findMany({
      where: { id: { in: categoryIds }, isActive: true },
      select: { id: true },
    })

    if (valid.length !== categoryIds.length) {
      return invalidData(context, "Uma ou mais categorias são inválidas.")
    }
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  await prisma.$transaction([
    prisma.professionalCategory.deleteMany({ where: { professionalId } }),
    ...(categoryIds.length > 0
      ? [
          prisma.professionalCategory.createMany({
            data: categoryIds.map((categoryId) => ({ professionalId, categoryId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ])

  return context.json({ profile: await getProfessionalProfilePayload(user) })
}

export async function setProfessionalCitiesHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = setCitiesSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Cidades inválidas.")
  }

  const cityIds = [...new Set(parsed.data.cityIds)]

  if (cityIds.length > 0) {
    const valid = await prisma.city.findMany({
      where: { id: { in: cityIds } },
      select: { id: true },
    })

    if (valid.length !== cityIds.length) {
      return invalidData(context, "Uma ou mais cidades são inválidas.")
    }
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  await prisma.$transaction([
    prisma.professionalCity.deleteMany({ where: { professionalId } }),
    ...(cityIds.length > 0
      ? [
          prisma.professionalCity.createMany({
            data: cityIds.map((cityId) => ({ professionalId, cityId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ])

  return context.json({ profile: await getProfessionalProfilePayload(user) })
}

// Sugestão de nova categoria: o profissional propõe um nome quando não encontra
// categoria adequada. Fica pendente para análise administrativa manual — não vira
// categoria ativa nem aparece para outros usuários.
export async function createCategorySuggestionHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = categorySuggestionSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Sugestão inválida.")
  }

  const offensive = offensiveTextResponse(context, "category-suggestion:create", user.id, [
    parsed.data.name,
  ])

  if (offensive) {
    return offensive
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  await prisma.categorySuggestion.create({
    data: { professionalId, name: parsed.data.name },
  })

  return context.json({ ok: true })
}

export async function professionalReviewsHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const reviews = await prisma.review.findMany({
    where: { reviewedId: user.id, hiddenAt: null },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      serviceContract: {
        select: {
          serviceRequest: {
            select: { title: true, category: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return context.json({
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      serviceTitle: review.serviceContract.serviceRequest.title,
      serviceCategory: review.serviceContract.serviceRequest.category.name,
    })),
  })
}
