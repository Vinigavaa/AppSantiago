import { Ionicons } from "@expo/vector-icons"
import { type Href, router } from "expo-router"
import { useMemo, useState } from "react"
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { LoadingState } from "@/components/ui/LoadingState"
import { routes } from "@/constants/routes"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { SearchBar } from "@/features/client-home/components/SearchBar"
import { colors, spacing } from "@/features/client-home/theme"
import { SelectField } from "@/features/service-requests/components/SelectField"
import { useCatalog } from "@/features/service-requests/hooks"

import { ProfessionalCard } from "./components/ProfessionalCard"
import { useProfessionalSearch } from "./hooks"
import type { ProfessionalSort } from "./types"

// Opções fixas de nota mínima e ordenação, mapeadas para o formato do SelectField.
const RATING_OPTIONS = [
  { id: "any", label: "Qualquer nota" },
  { id: "3", label: "3+ estrelas" },
  { id: "4", label: "4+ estrelas" },
  { id: "4.5", label: "4,5+ estrelas" },
]

const SORT_OPTIONS: { id: ProfessionalSort; label: string }[] = [
  { id: "rating", label: "Melhor avaliação" },
  { id: "reviews", label: "Mais avaliações" },
  { id: "experience", label: "Mais experientes" },
  { id: "recent", label: "Mais recentes" },
]

export function ProfessionalSearchScreen() {
  const insets = useSafeAreaInsets()
  const { categories, cities } = useCatalog()
  const { filters, setField, resetFilters, results, isLoading, error } = useProfessionalSearch()
  const [showFilters, setShowFilters] = useState(false)

  // Filtros ativos (a ordenação conta quando difere do padrão). Alimenta o
  // contador no botão "Filtros" e a exibição do "Limpar".
  const activeCount = useMemo(() => {
    let count = 0
    if (filters.categoryId) count += 1
    if (filters.cityId) count += 1
    if (filters.minRating) count += 1
    if (filters.sort !== "rating") count += 1
    return count
  }, [filters])

  const categoryOptions = [
    { id: "all", label: "Todas as categorias" },
    ...categories.map((category) => ({ id: category.id, label: category.name })),
  ]
  const cityOptions = [
    { id: "all", label: "Todas as cidades" },
    ...cities.map((city) => ({ id: city.id, label: `${city.name}, ${city.state}` })),
  ]

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        data={results}
        keyExtractor={(professional) => professional.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Encontrar profissionais</Text>

            <SearchBar
              onChangeText={(value) => setField("q", value)}
              placeholder="Buscar por nome, categoria..."
              value={filters.q}
            />

            <View style={styles.filtersBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowFilters((current) => !current)}
                style={({ pressed }) => [styles.filtersToggle, pressed && styles.pressed]}
              >
                <Ionicons color={colors.textPrimary} name="options-outline" size={18} />
                <Text style={styles.filtersToggleText}>
                  Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
                </Text>
                <Ionicons
                  color={colors.textTertiary}
                  name={showFilters ? "chevron-up" : "chevron-down"}
                  size={16}
                />
              </Pressable>

              {activeCount > 0 ? (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={resetFilters}>
                  <Text style={styles.clearText}>Limpar</Text>
                </Pressable>
              ) : null}
            </View>

            {showFilters ? (
              <View style={styles.filtersPanel}>
                <SelectField
                  label="Categoria"
                  onSelect={(id) => setField("categoryId", id === "all" ? null : id)}
                  options={categoryOptions}
                  placeholder="Todas as categorias"
                  searchable
                  value={filters.categoryId}
                />
                <SelectField
                  label="Cidade"
                  onSelect={(id) => setField("cityId", id === "all" ? null : id)}
                  options={cityOptions}
                  placeholder="Todas as cidades"
                  searchable
                  value={filters.cityId}
                />
                <SelectField
                  label="Avaliação mínima"
                  onSelect={(id) => setField("minRating", id === "any" ? null : Number(id))}
                  options={RATING_OPTIONS}
                  placeholder="Qualquer nota"
                  value={filters.minRating === null ? "any" : String(filters.minRating)}
                />
                <SelectField
                  label="Ordenar por"
                  onSelect={(id) => setField("sort", id as ProfessionalSort)}
                  options={SORT_OPTIONS}
                  placeholder="Melhor avaliação"
                  value={filters.sort}
                />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={renderEmpty()}
        renderItem={({ item }) => (
          <ProfessionalCard
            onPress={() => router.push(`${routes.professionalProfile}?id=${item.id}` as Href)}
            professional={item}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )

  function renderEmpty() {
    if (isLoading) {
      return <LoadingState />
    }

    if (error) {
      return (
        <EmptyState
          description={error}
          icon="cloud-offline-outline"
          title="Não foi possível buscar"
        />
      )
    }

    return (
      <EmptyState
        description="Nenhum profissional encontrado com esses filtros. Tente ampliar a busca ou remover alguns filtros."
        icon="search-outline"
        title="Nenhum resultado"
      />
    )
  }
}

const styles = StyleSheet.create({
  clearText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    gap: spacing.cardGap,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  filtersBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filtersPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    padding: spacing.card,
  },
  filtersToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  filtersToggleText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    gap: 14,
    paddingBottom: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
