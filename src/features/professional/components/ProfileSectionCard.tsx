import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing } from "@/features/client-home/theme"

type Props = {
  title: string
  actionLabel?: string
  onPressAction?: () => void
  children: ReactNode
}

// Cartão de seção com cabeçalho (título + ação opcional). Usado nas áreas
// editáveis do perfil (informações, categorias, cidades).
export function ProfileSectionCard({ title, actionLabel, onPressAction, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && onPressAction ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onPressAction}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  action: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    padding: spacing.card,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
})
