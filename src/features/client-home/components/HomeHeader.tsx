import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "../theme"

type Props = {
  greeting: string
  name: string
  initials: string
  hasNotifications: boolean
  onPressNotifications: () => void
  onPressAvatar: () => void
}

export function HomeHeader({
  greeting,
  name,
  initials,
  hasNotifications,
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
          {hasNotifications ? <View style={styles.badge} /> : null}
        </Pressable>

        <Pressable
          accessibilityLabel="Seu perfil"
          accessibilityRole="button"
          onPress={onPressAvatar}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
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
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 15,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    right: 6,
    top: 6,
    width: 12,
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
