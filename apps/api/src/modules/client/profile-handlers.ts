import { prisma } from "@santiago/database"

import type { AuthedContext } from "@/modules/shared/require-auth"

import { getOrCreateClientProfileId } from "./client-context"
import { getClientProfilePayload } from "./profile-data"
import { updateClientProfileSchema } from "./schemas"

function forbidden(context: AuthedContext) {
  return context.json({ code: "FORBIDDEN", message: "Disponível apenas para clientes." }, 403)
}

function invalidData(context: AuthedContext, message: string) {
  return context.json({ code: "INVALID_DATA", message }, 400)
}

// Normaliza texto opcional: vazio vira null (limpa o campo).
function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function clientProfileHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return forbidden(context)
  }

  await getOrCreateClientProfileId(user.id)

  return context.json({ profile: await getClientProfilePayload(user) })
}

export async function updateClientProfileHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return forbidden(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = updateClientProfileSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const { name } = parsed.data

  let phone: string | null = null
  const rawPhone = normalizeOptional(parsed.data.phone)

  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, "")

    if (digits.length < 10 || digits.length > 11) {
      return invalidData(context, "Telefone inválido. Use DDD + número.")
    }

    phone = digits
  }

  await getOrCreateClientProfileId(user.id)

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name.trim(), phone },
  })

  return context.json({ profile: await getClientProfilePayload(user) })
}

// Avaliações recebidas pelo cliente (deixadas por profissionais após serviços
// concluídos). Lista cronológica, somente leitura.
export async function clientReviewsHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return forbidden(context)
  }

  const reviews = await prisma.review.findMany({
    where: { reviewedId: user.id },
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
