import { Ionicons } from "@expo/vector-icons"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

import type { PortfolioItem } from "../types"

type Props = {
  items: PortfolioItem[]
  // Modo de gerenciamento (perfil próprio): habilita remover e adicionar.
  onRemove?: (id: string) => void
  onAdd?: () => void
  canAdd?: boolean
  emptyText?: string
}

// Grade do portfólio. Em modo leitura (perfil público) mostra só as imagens; em
// modo de gerenciamento (perfil próprio) permite remover e adicionar.
export function PortfolioGrid({ items, onRemove, onAdd, canAdd, emptyText }: Props) {
  const manage = Boolean(onAdd)

  if (items.length === 0 && !manage) {
    return <Text style={styles.empty}>{emptyText ?? "Nenhum trabalho no portfólio ainda."}</Text>
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.id} style={styles.tile}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          {item.title ? (
            <Text numberOfLines={1} style={styles.title}>
              {item.title}
            </Text>
          ) : null}

          {onRemove ? (
            <Pressable
              accessibilityLabel="Remover do portfólio"
              hitSlop={6}
              onPress={() => onRemove(item.id)}
              style={styles.remove}
            >
              <Ionicons color="#FFFFFF" name="close" size={14} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {manage && canAdd ? (
        <Pressable
          accessibilityLabel="Adicionar ao portfólio"
          accessibilityRole="button"
          onPress={onAdd}
          style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textTertiary} name="add" size={28} />
          <Text style={styles.addText}>Adicionar</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  addText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  addTile: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.card,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 4,
    justifyContent: "center",
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  image: {
    aspectRatio: 1,
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.card,
    width: "100%",
  },
  pressed: {
    opacity: 0.7,
  },
  remove: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 24,
  },
  tile: {
    // Duas colunas: metade da largura menos metade do gap.
    flexBasis: "48%",
    gap: 4,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 13,
  },
})
