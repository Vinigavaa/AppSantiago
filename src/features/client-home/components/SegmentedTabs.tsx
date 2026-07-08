import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "../theme"

export type SegmentedTab<K extends string> = {
  key: K
  label: string
  count: number
}

type Props<K extends string> = {
  tabs: SegmentedTab<K>[]
  active: K
  onSelect: (key: K) => void
}

// Abas por status (sem "Todas"): cada uma mostra o total entre parênteses e a
// ativa recebe destaque. Visual compartilhado entre as telas do app (propostas,
// solicitações), mantendo consistência.
export function SegmentedTabs<K extends string>({ tabs, active, onSelect }: Props<K>) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === active

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive ? styles.tabActive : styles.tabInactive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}
            >
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  labelActive: {
    color: "#FFFFFF",
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
  },
  row: {
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.search,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: radius.tag,
    flex: 1,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
})
