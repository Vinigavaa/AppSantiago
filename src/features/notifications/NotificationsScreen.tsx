import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatRelativeTime } from "@/features/service-requests/format"

import { getNotificationStyle } from "./format"
import { useNotificationCenter } from "./hooks"
import type { AppNotification } from "./types"

export function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { notifications, isLoading, isRefreshing, error, refetch } = useNotificationCenter()

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
        <Text style={styles.headerTitle}>Notificações</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}
      </ScrollView>
    </View>
  )

  function renderBody() {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
    }

    if (error && notifications.length === 0) {
      return (
        <EmptyState
          actionLabel="Tentar novamente"
          description={error}
          icon="cloud-offline-outline"
          onPressAction={refetch}
          title="Não foi possível carregar"
        />
      )
    }

    if (notifications.length === 0) {
      return (
        <EmptyState
          description="Você verá aqui propostas, contratações, atualizações de serviços e avaliações."
          icon="notifications-outline"
          title="Nenhuma notificação"
        />
      )
    }

    return (
      <View style={styles.list}>
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </View>
    )
  }
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const style = getNotificationStyle(notification.type)

  return (
    <View style={[styles.row, !notification.read && styles.rowUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accentSoftBg }]}>
        <Ionicons color={style.color} name={style.icon} size={20} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{notification.title}</Text>
          {!notification.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.rowMessage}>{notification.message}</Text>
        <Text style={styles.rowDate}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
    </View>
  )
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
    paddingVertical: 48,
  },
  content: {
    gap: spacing.cardGap,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
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
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.tag,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  list: {
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: spacing.card,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowDate: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  rowMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  rowTitle: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  rowUnread: {
    backgroundColor: colors.accentSoftBg,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  unreadDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 9,
    width: 9,
  },
})
