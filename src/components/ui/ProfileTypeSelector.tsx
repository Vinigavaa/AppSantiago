import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius, typography } from "@/features/client-home/theme"
import type { AuthRole } from "@/types/auth"

type Props = {
  value: AuthRole
  onChange: (value: AuthRole) => void
  error?: string
}

const options: Array<{ label: string; value: AuthRole }> = [
  { label: "Cliente", value: "CLIENT" },
  { label: "Profissional", value: "PROFESSIONAL" },
]

export function ProfileTypeSelector({ value, onChange, error }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tipo de perfil</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === value

          return (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, isSelected && styles.selected]}
            >
              <Text style={[styles.optionLabel, isSelected && styles.selectedLabel]}>{option.label}</Text>
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
    gap: 6,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  optionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  options: {
    flexDirection: "row",
    gap: 8,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectedLabel: {
    color: colors.onPrimary,
  },
})
