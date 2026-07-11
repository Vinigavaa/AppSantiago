import { Ionicons } from "@expo/vector-icons"
import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { colors, spacing } from "@/features/client-home/theme"

// Cabeçalho de tela padrão: botão de voltar e título sempre iguais, com um slot
// opcional à direita para uma ação (ex.: menu). Cuida da área segura no topo.
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
      ) : null}

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      {right ?? <View style={styles.rightSpacer} />}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.7,
  },
  rightSpacer: {
    width: 40,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
})
