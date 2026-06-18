import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "../theme"

type Props = {
  options: string[]
  active: string
  onSelect: (option: string) => void
}

export function FilterChips({ options, active, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isActive = option === active

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {option}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: colors.chipActiveBg,
  },
  chipInactive: {
    backgroundColor: colors.chipInactiveBg,
    borderColor: colors.chipInactiveBorder,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  labelActive: {
    color: colors.chipActiveText,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
})
