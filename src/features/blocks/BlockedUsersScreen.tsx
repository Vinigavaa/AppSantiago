import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { ChatAvatar } from "@/features/chat/components/ChatAvatar"
import { colors, radius, spacing } from "@/features/client-home/theme"

import { fetchBlockedUsers, unblockUser } from "./service"
import type { BlockedUser } from "./types"

// Lista os usuários bloqueados pelo usuário atual, com a opção de desbloquear.
// É o lugar garantido para desfazer um bloqueio, já que a conversa fica oculta.
export function BlockedUsersScreen() {
  const insets = useSafeAreaInsets()
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Usuários bloqueados</Text>
      </View>

      {renderBody()}
    </View>
  )

  function renderBody() {
    if (isLoading && users.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
    }

    if (error && users.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.infoText}>{error}</Text>
          <Button label="Tentar novamente" onPress={load} style={styles.retry} variant="secondary" />
        </View>
      )
    }

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={users}
        keyExtractor={(user) => user.userId}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons color={colors.textTertiary} name="lock-open-outline" size={36} />
            <Text style={styles.infoText}>Você não bloqueou ninguém.</Text>
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
  backButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  centered: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 60,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
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
  retry: {
    paddingHorizontal: 24,
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
