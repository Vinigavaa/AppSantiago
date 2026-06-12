import { Pressable, StyleSheet, Text, View } from "react-native"

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
    color: "#B91C1C",
    fontSize: 13,
  },
  label: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  option: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  optionLabel: {
    color: "#334155",
    fontWeight: "600",
  },
  options: {
    flexDirection: "row",
    gap: 8,
  },
  selected: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  selectedLabel: {
    color: "#FFFFFF",
  },
})
