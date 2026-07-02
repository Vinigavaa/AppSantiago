import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

export type ProposalTabKey = "pending" | "accepted" | "closed"

const TABS: { key: ProposalTabKey; label: string }[] = [
  { key: "pending", label: "Pendentes" },
  { key: "accepted", label: "Aceitas" },
  { key: "closed", label: "Recusadas" },
]

type Props = {
  active: ProposalTabKey
  counts: Record<ProposalTabKey, number>
  onSelect: (key: ProposalTabKey) => void
}

// Abas por status (sem "Todas"): cada uma mostra o total entre parênteses e a
// ativa recebe destaque. O contador vem da lista completa, então se mantém
// sincronizado conforme as propostas mudam de status.
export function ProposalTabs({ active, counts, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
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
              {tab.label} ({counts[tab.key]})
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
