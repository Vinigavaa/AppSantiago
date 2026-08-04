import { StyleSheet, Text, View } from "react-native"

import { colors } from "@/features/client-home/theme"

// Indicador de pendência sobre o ícone da aba. Mesma linguagem visual do badge
// do sino na home (HomeHeader): círculo da cor da marca, borda branca para
// separar do ícone, número até 9+.
export function TabBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null
  }

  return (
    <View pointerEvents="none" style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
    right: -8,
    top: -6,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: "700",
  },
})
