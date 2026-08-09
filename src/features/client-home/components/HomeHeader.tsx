import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Avatar } from "@/components/ui/Avatar"

import { colors, radius } from "../theme"

const AVATAR_SIZE = 44

type Props = {
  greeting: string
  name: string
  initials: string
  avatarUrl: string | null | undefined
  unreadCount: number
  onPressNotifications: () => void
  onPressAvatar: () => void
}

export function HomeHeader({
  greeting,
  name,
  initials,
  avatarUrl,
  unreadCount,
  onPressNotifications,
  onPressAvatar,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.textColumn}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Notificações"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPressNotifications}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="notifications-outline" size={22} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityLabel="Seu perfil"
          accessibilityRole="button"
          onPress={onPressAvatar}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar initials={initials} size={AVATAR_SIZE} uri={avatarUrl} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: 2,
    top: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.avatar,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  textColumn: {
    flexShrink: 1,
    paddingRight: 12,
  },
})
