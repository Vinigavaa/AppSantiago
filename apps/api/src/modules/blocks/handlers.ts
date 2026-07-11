import { prisma } from "@santiago/database"
import { z } from "zod"

import type { AuthedContext } from "@/modules/shared/require-auth"

const blockSchema = z.object({ targetUserId: z.uuid() })
const idSchema = z.uuid()

function invalidData(context: AuthedContext, message: string) {
  return context.json({ code: "INVALID_DATA", message }, 400)
}

// Bloqueia outro usuário. Idempotente: bloquear de novo não gera erro nem duplica.
// O histórico das conversas é preservado — o bloqueio só oculta e veda a interação.
export async function blockUserHandler(context: AuthedContext) {
  const user = context.get("user")

  const body = await context.req.json().catch(() => null)
  const parsed = blockSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }

  if (parsed.data.targetUserId === user.id) {
    return invalidData(context, "Você não pode bloquear a si mesmo.")
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
    select: { id: true },
  })

  if (!target) {
    return context.json({ code: "NOT_FOUND", message: "Usuário não encontrado." }, 404)
  }

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
    update: {},
    create: { blockerId: user.id, blockedId: target.id },
  })

  return context.json({ blocked: true })
}

// Desbloqueia. Só o autor do bloqueio pode desfazer — a condição no delete garante
// isso (não remove um bloqueio que o outro lado tenha feito contra este usuário).
export async function unblockUserHandler(context: AuthedContext) {
  const user = context.get("user")
  const targetUserId = context.req.param("targetUserId")

  if (!idSchema.safeParse(targetUserId).success) {
    return invalidData(context, "Usuário inválido.")
  }

  await prisma.userBlock.deleteMany({
    where: { blockerId: user.id, blockedId: targetUserId },
  })

  return context.json({ blocked: false })
}

// Lista os usuários que o usuário atual bloqueou (para a tela de gerenciamento e o
// botão "Desbloquear"). Não inclui quem bloqueou o usuário — esses ele não vê.
export async function listBlockedUsersHandler(context: AuthedContext) {
  const user = context.get("user")

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      blocked: { select: { id: true, name: true, displayUsername: true, avatarUrl: true, role: true } },
    },
  })

  return context.json({
    blocked: blocks.map((block) => ({
      userId: block.blocked.id,
      name: block.blocked.displayUsername ?? block.blocked.name,
      avatarUrl: block.blocked.avatarUrl,
      role: block.blocked.role,
      blockedAt: block.createdAt.toISOString(),
    })),
  })
}
