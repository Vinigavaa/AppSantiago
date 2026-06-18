import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"

import { colors, radius } from "../theme"

type Props = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  actionLabel?: string
  onPressAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onPressAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons color={colors.accent} name={icon} size={28} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onPressAction ? (
        <Button label={actionLabel} onPress={onPressAction} style={styles.action} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  action: {
    marginTop: 18,
    paddingHorizontal: 24,
  },
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.avatar,
    height: 64,
    justifyContent: "center",
    marginBottom: 16,
    width: 64,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
})
