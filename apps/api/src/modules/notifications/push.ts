import { prisma } from "@santiago/database"

// Endpoint público da Expo para envio de push. Não exige chave para o MVP.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

type PushMessage = {
  to: string
  title: string
  body: string
  sound: "default"
}

// Envio de push para um ou mais usuários. É best-effort: nunca lança, apenas
// registra falhas. A notificação no banco continua sendo a fonte de verdade.
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
): Promise<void> {
  if (userIds.length === 0) {
    return
  }

  try {
    const tokens = await prisma.devicePushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    })

    if (tokens.length === 0) {
      return
    }

    const messages: PushMessage[] = tokens.map((item) => ({
      to: item.token,
      title,
      body,
      sound: "default",
    }))

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
    })

    if (!response.ok) {
      console.error("[push] Expo respondeu com erro", response.status)
    }
  } catch (error) {
    console.error("[push] falha ao enviar push", error)
  }
}

export function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  return sendPushToUsers([userId], title, body)
}
