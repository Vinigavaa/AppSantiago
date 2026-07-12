import { prisma } from "@santiago/database"

import type { AuthedContext } from "@/modules/shared/require-auth"

function forbidden(context: AuthedContext) {
  return context.json({ code: "FORBIDDEN", message: "Disponível apenas para clientes." }, 403)
}

// Exclusão definitiva da conta do cliente.
//
// Trava de segurança: um serviço em andamento envolve a outra parte, então a
// conta não pode ser removida enquanto houver contrato ACCEPTED ou IN_PROGRESS.
//
// A limpeza é feita em uma transação explícita porque o schema usa onDelete:
// Restrict em contratos e avaliações — apagar o usuário direto falharia. Removemos
// primeiro os registros que dependem do usuário e, por fim, o próprio usuário
// (o cascade cuida de perfil, solicitações, propostas, chats, sessões, etc.).
export async function deleteClientAccountHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return forbidden(context)
  }

  const profile = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (profile) {
    const activeContracts = await prisma.serviceContract.count({
      where: { clientId: profile.id, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
    })

    if (activeContracts > 0) {
      return context.json(
        {
          code: "ACTIVE_CONTRACTS",
          message:
            "Você tem serviços em andamento. Conclua ou cancele antes de excluir sua conta.",
        },
        409,
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    // Avaliações escritas pelo cliente e recebidas por ele (Restrict nos dois lados).
    await tx.review.deleteMany({
      where: { OR: [{ reviewerId: user.id }, { reviewedId: user.id }] },
    })

    // Contratos do cliente (restam apenas concluídos/cancelados após a trava acima).
    if (profile) {
      await tx.serviceContract.deleteMany({ where: { clientId: profile.id } })
    }

    // Remove o usuário: o cascade elimina perfil, solicitações, propostas, fotos,
    // chats, mensagens, bloqueios, notificações, tokens de push, sessões e contas.
    await tx.user.delete({ where: { id: user.id } })
  })

  return context.json({ deleted: true })
}
