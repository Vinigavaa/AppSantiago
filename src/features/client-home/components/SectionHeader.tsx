import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors } from "../theme"

type Props = {
  title: string
  actionLabel?: string
  onPressAction?: () => void
}

export function SectionHeader({ title, actionLabel, onPressAction }: Props) {
  return (
    <View style={styles.container}>
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
  )
}

const styles = StyleSheet.create({
  action: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "500",
  },
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
})
