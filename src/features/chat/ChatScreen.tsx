import { type Href, router } from "expo-router"
import { useRef } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { blockUser } from "@/features/blocks/service"
import { colors, spacing } from "@/features/client-home/theme"

import { ChatHeader } from "./components/ChatHeader"
import { MessageBubble } from "./components/MessageBubble"
import { MessageInput } from "./components/MessageInput"
import { useChat } from "./hooks"
import type { ChatMessage, ChatOtherUser } from "./types"

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
  const { messages, otherUser, isLoading, error, send, retry, remove } = useChat(chatId)
  const listRef = useRef<FlatList>(null)

  const profileHref = otherUser ? profileHrefFor(otherUser) : null

  // Bloquear a outra pessoa: confirma, bloqueia e sai da conversa (que passa a
  // ficar oculta para os dois lados). O bloqueio é aplicado no backend.
  function confirmBlock() {
    if (!otherUser) {
      return
    }

    Alert.alert(
      `Bloquear ${otherUser.name}?`,
      "Vocês deixarão de aparecer um para o outro e não poderão mais trocar mensagens. Você pode desfazer em Usuários bloqueados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            const result = await blockUser(otherUser.userId)
            if (result.ok) {
              router.back()
            } else {
              Alert.alert("Não foi possível bloquear", result.error)
            }
          },
        },
      ],
    )
  }

  // Pressionar e segurar uma mensagem enviada: só é possível excluir enquanto ela
  // não foi lida. Mensagens ainda em envio/falha não entram nesse fluxo.
  function handleLongPress(message: ChatMessage) {
    if (!message.mine || message.status) {
      return
    }

    if (message.read) {
      Alert.alert(
        "Não é possível excluir",
        "Esta mensagem já foi visualizada pela outra pessoa e não pode mais ser excluída.",
      )
      return
    }

    Alert.alert("Mensagem", undefined, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir mensagem", style: "destructive", onPress: () => confirmDelete(message) },
    ])
  }

  function confirmDelete(message: ChatMessage) {
    Alert.alert(
      "Excluir mensagem?",
      "A mensagem será removida definitivamente para você e para a outra pessoa. Só é possível excluir enquanto ela ainda não foi lida.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            const result = await remove(message)
            if (!result.ok) {
              Alert.alert("Não foi possível excluir", result.error ?? "Tente novamente.")
            }
          },
        },
      ],
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
      style={styles.screen}
    >
      <ChatHeader
        onBack={() => router.back()}
        onBlock={confirmBlock}
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
          renderItem={({ item }) => (
            <MessageBubble message={item} onLongPress={handleLongPress} onRetry={retry} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={{ paddingBottom: insets.bottom }}>
        <MessageInput onSend={send} />
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
