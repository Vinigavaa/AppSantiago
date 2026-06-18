import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

import type { Urgency } from "../types"

type Props = {
  value: Urgency | null
  onSelect: (urgency: Urgency) => void
  error?: string
}

const OPTIONS: { value: Urgency; title: string; subtitle: string }[] = [
  { value: "URGENT", title: "Urgente", subtitle: "O quanto antes" },
  { value: "THIS_WEEK", title: "Em breve", subtitle: "Nos próximos dias" },
  { value: "FLEXIBLE", title: "Flexível", subtitle: "Sem pressa" },
]

export function UrgencyPicker({ value, onSelect, error }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quando precisa?</Text>

      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const isActive = option.value === value

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.option,
                isActive && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.title, isActive && styles.titleActive]}>{option.title}</Text>
              <Text style={[styles.subtitle, isActive && styles.subtitleActive]}>
                {option.subtitle}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.search,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: colors.accentSoftBg,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  subtitleActive: {
    color: "#1F7A45",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  titleActive: {
    color: "#1F7A45",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
})
