import { router } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native"

import { LoadingState } from "@/components/ui/LoadingState"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { ChatAvatar } from "@/features/chat/components/ChatAvatar"
import { colors, radius, spacing } from "@/features/client-home/theme"

import { fetchBlockedUsers, unblockUser } from "./service"
import type { BlockedUser } from "./types"

// Lista os usuários bloqueados pelo usuário atual, com a opção de desbloquear.
// É o lugar garantido para desfazer um bloqueio, já que a conversa fica oculta.
export function BlockedUsersScreen() {
  const [users, setUsers] = useState<BlockedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await fetchBlockedUsers()

    if (result.ok) {
      setUsers(result.data)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleUnblock(user: BlockedUser) {
    setUpdatingId(user.userId)
    const result = await unblockUser(user.userId)
    setUpdatingId(null)

    if (result.ok) {
      setUsers((previous) => previous.filter((item) => item.userId !== user.userId))
    } else {
      Alert.alert("Não foi possível desbloquear", result.error)
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={() => router.back()} title="Usuários bloqueados" />

      {renderBody()}
    </View>
  )

  function renderBody() {
    if (isLoading && users.length === 0) {
      return <LoadingState />
    }

    if (error && users.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <EmptyState
            actionLabel="Tentar novamente"
            description={error}
            icon="cloud-offline-outline"
            onPressAction={load}
            title="Não foi possível carregar"
          />
        </View>
      )
    }

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={users}
        keyExtractor={(user) => user.userId}
        ListEmptyComponent={
          <View style={styles.stateWrap}>
            <EmptyState
              description="Você não bloqueou ninguém. Perfis que você bloquear aparecem aqui."
              icon="lock-open-outline"
              title="Nenhum usuário bloqueado"
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ChatAvatar avatarUrl={item.avatarUrl} name={item.name} size={44} />
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={updatingId === item.userId}
              onPress={() => handleUnblock(item)}
              style={({ pressed }) => [styles.unblockButton, pressed && styles.pressed]}
            >
              {updatingId === item.userId ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.unblockText}>Desbloquear</Text>
              )}
            </Pressable>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    )
  }
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    gap: 10,
    paddingBottom: 32,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  name: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  stateWrap: {
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  unblockButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.chip,
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  unblockText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
})
