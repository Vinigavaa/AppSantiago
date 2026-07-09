import { type Href, router } from "expo-router"
import { useRef } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { colors, spacing } from "@/features/client-home/theme"

import { ChatHeader } from "./components/ChatHeader"
import { MessageBubble } from "./components/MessageBubble"
import { MessageInput } from "./components/MessageInput"
import { useChat } from "./hooks"
import type { ChatOtherUser } from "./types"

// Perfil completo da outra pessoa, quando houver tela para ele. O perfil do
// profissional já existe; o do cliente chega na etapa de bloqueio.
function profileHrefFor(otherUser: ChatOtherUser): Href | null {
  if (otherUser.role === "PROFESSIONAL") {
    return `${routes.professionalProfile}?id=${otherUser.profileId}` as Href
  }
  return null
}

export function ChatScreen({ chatId }: { chatId: string }) {
  const insets = useSafeAreaInsets()
  const { messages, otherUser, isLoading, error, isSending, send } = useChat(chatId)
  const listRef = useRef<FlatList>(null)

  const profileHref = otherUser ? profileHrefFor(otherUser) : null

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
      style={styles.screen}
    >
      <ChatHeader
        onBack={() => router.back()}
        onOpenProfile={profileHref ? () => router.push(profileHref) : undefined}
        otherUser={otherUser}
        paddingTop={insets.top}
      />

      {isLoading && messages.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error && messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(message) => message.id}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyText}>
                Nenhuma mensagem ainda. Diga olá e combine os detalhes do serviço.
              </Text>
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ref={listRef}
          renderItem={({ item }) => <MessageBubble message={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={{ paddingBottom: insets.bottom }}>
        <MessageInput isSending={isSending} onSend={send} />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  emptyChat: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    flexGrow: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
