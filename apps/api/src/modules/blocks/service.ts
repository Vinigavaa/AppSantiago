import { prisma } from "@santiago/database"

// Existe bloqueio entre os dois usuários em qualquer direção? Basta um dos lados
// ter bloqueado o outro para que a interação (conversa, oportunidade) fique vedada.
export async function isBlockedBetween(userA: string, userB: string): Promise<boolean> {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { id: true },
  })

  return block !== null
}

// Ids de usuários "invisíveis" para este usuário: os que ele bloqueou e os que o
// bloquearam. Usado para filtrar listas (conversas, oportunidades) numa só query.
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  })

  const ids = new Set<string>()

  for (const block of blocks) {
    ids.add(block.blockerId === userId ? block.blockedId : block.blockerId)
  }

  return [...ids]
}

// Estado do bloqueio entre o usuário atual e um alvo, para a UI decidir o que
// mostrar: `byMe` habilita "Desbloquear"; `byThem` deixa o perfil indisponível.
export async function blockStateBetween(
  currentUserId: string,
  targetUserId: string,
): Promise<{ byMe: boolean; byThem: boolean }> {
  const blocks = await prisma.userBlock.findMany({
    where: {
      OR: [
        { blockerId: currentUserId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: currentUserId },
      ],
    },
    select: { blockerId: true },
  })

  return {
    byMe: blocks.some((block) => block.blockerId === currentUserId),
    byThem: blocks.some((block) => block.blockerId === targetUserId),
  }
}
