import { prisma } from "@santiago/database"
import { z } from "zod"

import type { AuthedContext } from "@/modules/shared/require-auth"
import { deleteImages } from "@/modules/uploads/cleanup"
import { portfolioFolder } from "@/modules/uploads/folders"
import { resolveScopedPhotoUrl } from "@/modules/uploads/handlers"

import { getOrCreateProfessionalProfileId } from "./professional-context"

// Limite de itens no portfolio. Suficiente para uma boa vitrine sem pesar.
const MAX_PORTFOLIO_ITEMS = 12

const idSchema = z.uuid()

const createSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(80),
  description: z.string().trim().max(500).nullable().optional(),
  photo: z.object({
    publicId: z.string().min(1).max(300),
    version: z.coerce.number().int().positive(),
  }),
})

function forbidden(context: AuthedContext) {
  return context.json(
    { code: "FORBIDDEN", message: "Disponível apenas para profissionais." },
    403,
  )
}

// Adiciona um item ao portfolio. A imagem já foi enviada à Cloudinary (upload
// assinado); aqui validamos a posse (pasta do usuario) e montamos a URL final.
export async function createPortfolioItemHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  const count = await prisma.professionalPortfolioItem.count({ where: { professionalId } })

  if (count >= MAX_PORTFOLIO_ITEMS) {
    return context.json(
      {
        code: "PORTFOLIO_FULL",
        message: `Seu portfólio já tem o máximo de ${MAX_PORTFOLIO_ITEMS} itens.`,
      },
      400,
    )
  }

  const imageUrl = resolveScopedPhotoUrl(
    portfolioFolder(user.id),
    parsed.data.photo.publicId,
    parsed.data.photo.version,
  )

  if (!imageUrl) {
    return context.json(
      { code: "INVALID_PHOTO", message: "Não foi possível anexar a imagem enviada." },
      400,
    )
  }

  const item = await prisma.professionalPortfolioItem.create({
    data: {
      professionalId,
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      imageUrl,
      publicId: parsed.data.photo.publicId,
    },
    select: { id: true, title: true, description: true, imageUrl: true },
  })

  return context.json({ item }, 201)
}

// Remove um item do portfolio. Só o dono remove — a condição por professionalId
// garante que ninguem apaga item de outro profissional.
export async function deletePortfolioItemHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Item inválido." }, 400)
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  // Busca antes de apagar para ter o publicId da imagem. O filtro por
  // professionalId continua sendo a autorização: item de outro dono não aparece.
  const item = await prisma.professionalPortfolioItem.findFirst({
    where: { id, professionalId },
    select: { id: true, publicId: true },
  })

  if (!item) {
    return context.json({ code: "NOT_FOUND", message: "Item não encontrado." }, 404)
  }

  await prisma.professionalPortfolioItem.delete({ where: { id: item.id } })

  // A imagem sai depois do banco confirmar: se o CDN falhar, o item já foi
  // removido e o arquivo órfão fica registrado no log.
  await deleteImages([item.publicId])

  return context.json({ ok: true })
}
