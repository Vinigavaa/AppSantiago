import { Redirect, useLocalSearchParams } from "expo-router"

import { routes } from "@/constants/routes"
import { ChatScreen } from "@/features/chat/ChatScreen"

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!id) {
    return <Redirect href={routes.messages} />
  }

  return <ChatScreen chatId={id} />
}
