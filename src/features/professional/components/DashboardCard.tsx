import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

type IoniconName = keyof typeof Ionicons.glyphMap

type Props = {
  icon: IoniconName
  label: string
  value: string | number
  // Quando presente, o cartão vira um atalho para a lista já filtrada.
  onPress?: () => void
  // Destaque para o cartão de faturamento.
  tone?: "default" | "accent"
}

// Cartão de resumo do painel do profissional. Ocupa metade da linha (flex: 1) e
// segue o mesmo visual limpo dos demais cartões do app.
export function DashboardCard({ icon, label, value, onPress, tone = "default" }: Props) {
  const isAccent = tone === "accent"

  const content = (
    <>
      <View style={[styles.iconWrap, isAccent && styles.iconWrapAccent]}>
        <Ionicons color={isAccent ? colors.accent : colors.textSecondary} name={icon} size={20} />
      </View>

      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>

      {onPress ? (
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Ver</Text>
          <Ionicons color={colors.accent} name="chevron-forward" size={13} />
        </View>
      ) : null}
    </>
  )

  if (!onPress) {
    return <View style={styles.card}>{content}</View>
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 16,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.avatar,
    height: 40,
    justifyContent: "center",
    marginBottom: 4,
    width: 40,
  },
  iconWrapAccent: {
    backgroundColor: colors.accentSoftBg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  linkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
})
