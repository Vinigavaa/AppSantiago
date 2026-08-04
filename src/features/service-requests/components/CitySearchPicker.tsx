import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { FormSheet } from "@/components/ui/FormSheet"
import { colors, radius } from "@/features/client-home/theme"
import { fetchCitySearch } from "@/features/service-requests/service"
import type { City } from "@/features/service-requests/types"

type Props = {
  label: string
  placeholder: string
  value: City | null
  onSelect: (city: City) => void
  error?: string
  // Opcional: quando presente, exibe a ação de limpar a seleção (ex.: filtro
  // "Todas as cidades" na busca de profissionais).
  onClear?: () => void
}

// Espera após digitar antes de buscar — evita uma requisição por tecla.
const SEARCH_DEBOUNCE_MS = 300

// Seletor de cidade com busca dinâmica no servidor (typeahead). Substitui o
// carregamento total da lista de cidades: com ~5.570 municípios, buscamos sob
// demanda conforme o usuário digita, ignorando acento e caixa (backend).
export function CitySearchPicker({ label, placeholder, value, onSelect, error, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Busca com debounce enquanto o modal está aberto. Termo vazio limpa a lista
  // (o backend também devolve vazio, mas evitamos a ida à rede).
  useEffect(() => {
    if (!open) {
      return
    }

    const term = query.trim()

    if (term.length === 0) {
      setResults([])
      setSearchError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

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
        setIsLoading(false)
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [open, query])

  function openModal() {
    setQuery("")
    setResults([])
    setSearchError(null)
    setOpen(true)
  }

  function handleSelect(city: City) {
    onSelect(city)
    setOpen(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {onClear && value ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClear}>
            <Text style={styles.clear}>Limpar</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={openModal}
        style={({ pressed }) => [
          styles.trigger,
          error && styles.triggerError,
          pressed && styles.pressed,
        ]}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? `${value.name} - ${value.state}` : placeholder}
        </Text>
        <Ionicons color={colors.textTertiary} name="chevron-down" size={18} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormSheet onClose={() => setOpen(false)} title={label} visible={open}>
        <TextInput
          autoCorrect={false}
          autoFocus
          onChangeText={setQuery}
          placeholder="Digite o nome da cidade..."
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
          value={query}
        />

        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<CityListEmpty error={searchError} loading={isLoading} query={query} />}
          renderItem={({ item }) => {
            const isSelected = item.id === value?.id

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={styles.optionLabel}>
                  {item.name} - {item.state}
                </Text>
                {isSelected ? <Ionicons color={colors.accent} name="checkmark" size={20} /> : null}
              </Pressable>
            )
          }}
          style={styles.list}
        />
      </FormSheet>
    </View>
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
      <View style={styles.empty}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  if (error) {
    return <Text style={styles.emptyText}>{error}</Text>
  }

  if (query.trim().length === 0) {
    return <Text style={styles.emptyText}>Digite para buscar sua cidade.</Text>
  }

  return <Text style={styles.emptyText}>Nenhuma cidade encontrada.</Text>
}

const styles = StyleSheet.create({
  clear: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  container: {
    gap: 6,
  },
  empty: {
    paddingVertical: 24,
  },
  emptyText: {
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
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  list: {
    // Encolhe quando o sheet atinge a altura máxima (teclado aberto), em vez de
    // estourar o container e ficar atrás do teclado.
    flexShrink: 1,
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
  optionLabel: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 16,
  },
  optionPressed: {
    opacity: 0.6,
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
  triggerError: {
    borderColor: colors.danger,
  },
  valueText: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 15,
  },
})
