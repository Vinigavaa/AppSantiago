import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "../theme"

type Props = {
  onPress: () => void
}

export function CreateRequestButton({ onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.iconCircle}>
        <Ionicons color={colors.surface} name="add" size={22} />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.title}>Criar solicitação</Text>
        <Text style={styles.subtitle}>Descreva o serviço e receba propostas</Text>
      </View>
      <Ionicons color={colors.surface} name="chevron-forward" size={20} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.avatar,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.9,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
})
