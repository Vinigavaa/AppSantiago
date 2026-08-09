import { type Href, router } from "expo-router"
import { useRef, useState } from "react"
import { Alert, FlatList, Platform, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useConfirm } from "@/components/ui/ConfirmDialog"
import { LoadingState } from "@/components/ui/LoadingState"
import { TAB_BAR_CONTENT_HEIGHT } from "@/constants/layout"
import { routes } from "@/constants/routes"
import { blockUser } from "@/features/blocks/service"
import { colors, spacing } from "@/features/client-home/theme"
import { ReportSheet } from "@/features/reports/ReportSheet"
import { useKeyboardHeight } from "@/lib/use-keyboard-height"

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
  const confirm = useConfirm()
  const { messages, otherUser, isLoading, error, send, retry, remove } = useChat(chatId)
  const listRef = useRef<FlatList>(null)
  const keyboardHeight = useKeyboardHeight()
  // Alvo da denúncia em aberto: a pessoa (pelo menu) ou uma mensagem recebida.
  const [report, setReport] = useState<{ type: "USER" | "MESSAGE"; id: string } | null>(null)

  // No Android o `softwareKeyboardLayoutMode: "resize"` já encolhe a janela: somar
  // padding aqui abriria uma faixa vazia entre o campo e o teclado. No iOS a
  // janela não muda, então o deslocamento precisa ser explícito.
  //
  // A altura do teclado é medida a partir da base da janela, mas esta tela vive
  // dentro das abas: a barra inferior já ocupa a faixa que o teclado cobre por
  // baixo. Sem descontá-la, o campo subia a mais e abria um vão (visível no
  // iPhone 11, onde a barra tem 58 + 34 da área segura).
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom
  const keyboardInset =
    Platform.OS === "ios" ? Math.max(keyboardHeight - tabBarHeight, 0) : 0

  const profileHref = otherUser ? profileHrefFor(otherUser) : null

  // Bloquear a outra pessoa: confirma, bloqueia e sai da conversa (que passa a
  // ficar oculta para os dois lados). O bloqueio é aplicado no backend.
  async function confirmBlock() {
    if (!otherUser) {
      return
    }

    const ok = await confirm({
      title: `Bloquear ${otherUser.name}?`,
      message:
        "Vocês deixarão de aparecer um para o outro e não poderão mais trocar mensagens. Você pode desfazer em Usuários bloqueados.",
      confirmLabel: "Bloquear",
      destructive: true,
    })
    if (!ok) {
      return
    }

    const result = await blockUser(otherUser.userId)
    if (result.ok) {
      router.back()
    } else {
      Alert.alert("Não foi possível bloquear", result.error)
    }
  }

  // Menu da conversa: denunciar a pessoa ou bloquear. As duas ações vivem juntas
  // porque quem abre o menu costuma estar reagindo ao mesmo incômodo.
  function openMenu() {
    if (!otherUser) {
      return
    }

    Alert.alert(otherUser.name, undefined, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Denunciar",
        onPress: () => setReport({ type: "USER", id: otherUser.userId }),
      },
      { text: "Bloquear", style: "destructive", onPress: confirmBlock },
    ])
  }

  // Pressionar e segurar uma mensagem. Na recebida, a ação é denunciar; na
  // enviada, excluir — e só enquanto ela não foi lida.
  async function handleLongPress(message: ChatMessage) {
    if (!message.mine) {
      if (otherUser) {
        setReport({ type: "MESSAGE", id: message.id })
      }
      return
    }

    if (message.status) {
      return
    }

    if (message.read) {
      Alert.alert(
        "Não é possível excluir",
        "Esta mensagem já foi visualizada pela outra pessoa e não pode mais ser excluída.",
      )
      return
    }

    const ok = await confirm({
      title: "Excluir mensagem?",
      message:
        "A mensagem será removida definitivamente para você e para a outra pessoa. Só é possível excluir enquanto ela ainda não foi lida.",
      confirmLabel: "Excluir",
      destructive: true,
    })
    if (!ok) {
      return
    }

    const result = await remove(message)
    if (!result.ok) {
      Alert.alert("Não foi possível excluir", result.error ?? "Tente novamente.")
    }
  }

  return (
    <View style={[styles.screen, { paddingBottom: keyboardInset }]}>
      <ChatHeader
        onBack={() => router.back()}
        onOpenMenu={openMenu}
        onOpenProfile={profileHref ? () => router.push(profileHref) : undefined}
        otherUser={otherUser}
        paddingTop={insets.top}
      />

      {isLoading && messages.length === 0 ? (
        <LoadingState fill />
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

      {/* Sem paddingBottom aqui: esta tela vive dentro das abas, e a barra de
          abas já reserva a área segura de baixo. Somar o inset de novo abriria
          uma faixa vazia entre o campo e a barra. */}
      <MessageInput onSend={send} />

      {report && otherUser ? (
        <ReportSheet
          onBlocked={() => router.back()}
          onClose={() => setReport(null)}
          targetId={report.id}
          targetType={report.type}
          targetUserId={otherUser.userId}
          targetUserName={otherUser.name}
          visible
        />
      ) : null}
    </View>
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
