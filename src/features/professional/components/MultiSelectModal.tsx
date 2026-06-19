import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { Button } from "@/components/ui/Button"
import { colors, radius } from "@/features/client-home/theme"

export type MultiSelectOption = {
  id: string
  label: string
  description?: string
}

type Props = {
  visible: boolean
  title: string
  options: MultiSelectOption[]
  selectedIds: string[]
  searchable?: boolean
  onClose: () => void
  // Persiste a seleção. Retorna uma mensagem de erro quando falha (modal segue
  // aberto), ou null em caso de sucesso (modal fecha).
  onSave: (ids: string[]) => Promise<string | null>
}

export function MultiSelectModal({
  visible,
  title,
  options,
  selectedIds,
  searchable = false,
  onClose,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<string[]>(selectedIds)
  const [query, setQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sincroniza a seleção local sempre que o modal abre com novos valores.
  useEffect(() => {
    if (visible) {
      setSelected(selectedIds)
      setQuery("")
      setError(null)
    }
  }, [visible, selectedIds])

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!term) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(term))
  }, [options, query])

  function toggle(id: string) {
    setError(null)
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function handleSave() {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await onSave(selected)

    setIsSaving(false)

    if (result) {
      setError(result)
      return
    }

    onClose()
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
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
            const isSelected = selected.includes(item.id)

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggle(item.id)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={styles.optionTextColumn}>
                  <Text style={styles.optionLabel}>{item.label}</Text>
                  {item.description ? (
                    <Text style={styles.optionDescription}>{item.description}</Text>
                  ) : null}
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                  {isSelected ? <Ionicons color="#FFFFFF" name="checkmark" size={16} /> : null}
                </View>
              </Pressable>
            )
          }}
          style={styles.list}
        />

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={isSaving}
            label={isSaving ? "Salvando..." : `Salvar (${selected.length})`}
            onPress={handleSave}
          />
        </View>

        {isSaving ? (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.chipInactiveBorder,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  empty: {
    color: colors.textSecondary,
    paddingVertical: 24,
    textAlign: "center",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  footer: {
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
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
  savingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
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
    maxHeight: "80%",
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
})
