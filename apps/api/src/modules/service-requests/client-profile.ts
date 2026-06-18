import { prisma } from "@santiago/database"

// Garante que o usuário possui um ClientProfile e devolve o id. O perfil já é
// criado no cadastro, mas o upsert mantém o fluxo robusto para contas antigas.
export async function getOrCreateClientProfileId(userId: string): Promise<string> {
  const profile = await prisma.clientProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  })

  return profile.id
}
