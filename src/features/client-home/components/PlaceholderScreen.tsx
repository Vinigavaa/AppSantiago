import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { ScrollView, StyleSheet, View } from "react-native"

import { ScreenHeader } from "@/components/ui/ScreenHeader"

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
  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={showBack ? () => router.back() : undefined} title={title} />

      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          actionLabel={actionLabel}
          description={emptyDescription}
          icon={icon}
          onPressAction={onPressAction}
          title={emptyTitle}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
