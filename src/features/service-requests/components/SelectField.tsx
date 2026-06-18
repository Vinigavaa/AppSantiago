import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { colors, radius } from "@/features/client-home/theme"

export type SelectOption = {
  id: string
  label: string
  description?: string
}

type Props = {
  label: string
  placeholder: string
  value: string | null
  options: SelectOption[]
  onSelect: (id: string) => void
  error?: string
  searchable?: boolean
  disabled?: boolean
}

// Campo de seleção com modal. Usado para categoria e cidade. Busca opcional
// para listas maiores (cidades).
export function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  error,
  searchable = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = options.find((option) => option.id === value) ?? null

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!term) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(term))
  }, [options, query])

  function handleSelect(id: string) {
    onSelect(id)
    setOpen(false)
    setQuery("")
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={selected ? styles.valueText : styles.placeholderText}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons color={colors.textTertiary} name="chevron-down" size={18} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal animationType="slide" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <Pressable onPress={() => setOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setOpen(false)}>
              <Ionicons color={colors.textSecondary} name="close" size={24} />
            </Pressable>
          </View>

          {searchable ? (
            <TextInput
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Buscar..."
              placeholderTextColor={colors.textTertiary}
              style={styles.search}
              value={query}
            />
          ) : null}

          <FlatList
            data={visibleOptions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>Nenhuma opção encontrada.</Text>}
            renderItem={({ item }) => {
              const isSelected = item.id === value

              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSelect(item.id)}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                >
                  <View style={styles.optionTextColumn}>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    {item.description ? (
                      <Text style={styles.optionDescription}>{item.description}</Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Ionicons color={colors.accent} name="checkmark" size={20} />
                  ) : null}
                </Pressable>
              )
            }}
            style={styles.list}
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
  },
  container: {
    gap: 6,
  },
  empty: {
    color: colors.textSecondary,
    paddingVertical: 24,
    textAlign: "center",
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
  list: {
    paddingHorizontal: 20,
  },
  option: {
    alignItems: "center",
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  optionLabel: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  optionPressed: {
    opacity: 0.6,
  },
  optionTextColumn: {
    flexShrink: 1,
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
  search: {
    backgroundColor: colors.screenBg,
    borderRadius: radius.search,
    color: colors.textPrimary,
    fontSize: 15,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingBottom: 24,
    paddingTop: 8,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  trigger: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.search,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 14,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerError: {
    borderColor: colors.danger,
  },
  valueText: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 15,
  },
})
