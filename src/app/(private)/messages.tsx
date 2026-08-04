import { ChatListScreen } from "@/features/chat/ChatListScreen"
import { useRefreshBadgesOnFocus } from "@/features/notifications/badges-context"

export default function Messages() {
  // Diferente das outras abas, abrir a lista não zera o indicador: ele cai
  // conforme cada conversa é aberta. Aqui apenas revalidamos a contagem.
  useRefreshBadgesOnFocus()

  return <ChatListScreen />
}
