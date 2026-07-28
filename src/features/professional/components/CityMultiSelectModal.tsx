import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
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
import { fetchCitySearch } from "@/features/service-requests/service"
import type { City } from "@/features/service-requests/types"

type Props = {
  visible: boolean
  title: string
  // Cidades já selecionadas (objetos completos, para exibir "Nome - UF" sem
  // precisar baixar a lista inteira).
  selected: City[]
  onClose: () => void
  // Persiste a seleção. Retorna mensagem de erro (modal segue aberto) ou null
  // em caso de sucesso (modal fecha).
  onSave: (ids: string[]) => Promise<string | null>
}

const SEARCH_DEBOUNCE_MS = 300

// Seleção de múltiplas cidades de atuação com busca no servidor. O profissional
// busca e adiciona cidades (sem duplicar) e remove pelas chips. Evita carregar
// os ~5.570 municípios de uma vez.
export function CityMultiSelectModal({ visible, title, selected, onClose, onSave }: Props) {
  const [chosen, setChosen] = useState<City[]>(selected)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<City[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sincroniza o estado local sempre que o modal abre com novos valores.
  useEffect(() => {
    if (visible) {
      setChosen(selected)
      setQuery("")
      setResults([])
      setSearchError(null)
      setSaveError(null)
    }
  }, [visible, selected])

  // Busca com debounce enquanto aberto.
  useEffect(() => {
    if (!visible) {
      return
    }

    const term = query.trim()

    if (term.length === 0) {
      setResults([])
      setSearchError(null)
      setIsSearching(false)
      return
    }

    let cancelled = false
    setIsSearching(true)

    const timeoutId = setTimeout(() => {
      void fetchCitySearch(term).then((result) => {
        if (cancelled) {
          return
        }
        if (result.ok) {
          setResults(result.data)
          setSearchError(null)
        } else {
          setSearchError(result.error)
        }
        setIsSearching(false)
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [visible, query])

  function add(city: City) {
    setSaveError(null)
    // Impede duplicata: só adiciona se ainda não estiver na seleção.
    setChosen((current) =>
      current.some((item) => item.id === city.id) ? current : [...current, city],
    )
  }

  function remove(id: string) {
    setSaveError(null)
    setChosen((current) => current.filter((item) => item.id !== id))
  }

  async function handleSave() {
    if (isSaving) {
      return
    }

    setIsSaving(true)
    setSaveError(null)

    const result = await onSave(chosen.map((city) => city.id))

    setIsSaving(false)

    if (result) {
      setSaveError(result)
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

        {chosen.length > 0 ? (
          <View style={styles.chips}>
            {chosen.map((city) => (
              <Pressable
                accessibilityRole="button"
                key={city.id}
                onPress={() => remove(city.id)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>
                  {city.name} - {city.state}
                </Text>
                <Ionicons color={colors.accent} name="close-circle" size={16} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyChips}>Busque e adicione as cidades onde você atende.</Text>
        )}

        <TextInput
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Buscar cidade para adicionar..."
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
          value={query}
        />

        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <CityListEmpty error={searchError} loading={isSearching} query={query} />
          }
          renderItem={({ item }) => {
            const isChosen = chosen.some((city) => city.id === item.id)

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => add(item)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={styles.optionLabel}>
                  {item.name} - {item.state}
                </Text>
                {isChosen ? (
                  <Ionicons color={colors.accent} name="checkmark" size={20} />
                ) : (
                  <Ionicons color={colors.textTertiary} name="add" size={20} />
                )}
              </Pressable>
            )
          }}
          style={styles.list}
        />

        <View style={styles.footer}>
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          <Button
            disabled={isSaving}
            label={isSaving ? "Salvando..." : `Salvar (${chosen.length})`}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  )
}

function CityListEmpty({
  error,
  loading,
  query,
}: {
  error: string | null
  loading: boolean
  query: string
}) {
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (error) {
    return <Text style={styles.emptyText}>{error}</Text>
  }

  if (query.trim().length === 0) {
    return <Text style={styles.emptyText}>Digite para buscar cidades.</Text>
  }

  return <Text style={styles.emptyText}>Nenhuma cidade encontrada.</Text>
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "500",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  emptyChips: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  emptyText: {
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
  loadingBox: {
    paddingVertical: 24,
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
  optionLabel: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 16,
  },
  optionPressed: {
    opacity: 0.6,
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
