import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EmptyState } from "./EmptyState"
import { colors, spacing } from "../theme"

type Props = {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  emptyTitle: string
  emptyDescription: string
  actionLabel?: string
  onPressAction?: () => void
  showBack?: boolean
}

// Tela base para as seções ainda sem integração: cabeçalho + estado vazio.
export function PlaceholderScreen({
  title,
  icon,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onPressAction,
  showBack = false,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      style={styles.screen}
    >
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>

      <EmptyState
        actionLabel={actionLabel}
        description={emptyDescription}
        icon={icon}
        onPressAction={onPressAction}
        title={emptyTitle}
      />
    </ScrollView>
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
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
