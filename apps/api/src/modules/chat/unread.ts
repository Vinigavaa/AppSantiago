import { prisma } from "@santiago/database"

import { getBlockedUserIds } from "@/modules/blocks/service"

// Mensagens recebidas ainda sem leitura, somando todas as conversas do usuário.
// Aplica o mesmo filtro de bloqueio da lista de conversas: como um dos lados do
// par é sempre o próprio usuário, filtrar pelos dois papéis exclui exatamente as
// conversas cujo "outro" participante está bloqueado.
//
// Esta é a fonte de verdade do badge de "Mensagens": Message.readAt é atualizado
// ao abrir cada conversa, então o indicador cai conversa a conversa.
export async function countUnreadMessages(userId: string): Promise<number> {
  const blockedUserIds = await getBlockedUserIds(userId)

  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      // Mensagem ocultada por moderação não existe para o destinatário — e não
      // pode deixar o badge de "Mensagens" aceso para sempre.
      hiddenAt: null,
      chat: {
        OR: [{ client: { userId } }, { professional: { userId } }],
        NOT: [
          { client: { userId: { in: blockedUserIds } } },
          { professional: { userId: { in: blockedUserIds } } },
        ],
      },
    },
  })
}
