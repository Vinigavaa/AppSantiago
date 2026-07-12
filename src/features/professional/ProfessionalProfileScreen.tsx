import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { LoadingState } from "@/components/ui/LoadingState"
import { routes } from "@/constants/routes"
import { SectionHeader } from "@/features/client-home/components/SectionHeader"
import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useCatalog } from "@/features/service-requests/hooks"

import { MultiSelectModal } from "./components/MultiSelectModal"
import { PersonalInfoModal } from "./components/PersonalInfoModal"
import { ProfileSectionCard } from "@/features/client-home/components/ProfileSectionCard"
import { ReputationCard } from "@/features/client-home/components/ReputationCard"
import { ReviewsSection } from "./components/ReviewsSection"
import { Stars } from "@/components/ui/Stars"
import { StatsSection } from "./components/StatsSection"
import { useProfessionalProfile, useProfessionalReviews } from "./hooks"
import {
  setProfessionalCategories,
  setProfessionalCities,
  updateProfessionalProfile,
} from "./service"
import type { ProfessionalProfileInfo, UpdateProfileInput } from "./types"

type OpenModal = "none" | "personal" | "categories" | "cities"

export function ProfessionalProfileScreen() {
  const insets = useSafeAreaInsets()
  const { profile, isLoading, error, reload, setProfile } = useProfessionalProfile()
  const reviews = useProfessionalReviews()
  const { categories, cities } = useCatalog()
  const { signOut, isSubmitting } = useAuth()

  const [openModal, setOpenModal] = useState<OpenModal>("none")
  const [notice, setNotice] = useState<string | null>(null)

  function showNotice(message: string) {
    setNotice(message)
    setTimeout(() => setNotice(null), 2500)
  }

  // Aplica o perfil retornado por uma alteração e dá feedback. Devolve null em
  // sucesso (o modal fecha) ou a mensagem de erro (o modal permanece aberto).
  function applyResult(
    result: { ok: true; data: ProfessionalProfileInfo } | { ok: false; error: string },
    successMessage: string,
  ): string | null {
    if (!result.ok) {
      return result.error
    }

    setProfile(result.data)
    showNotice(successMessage)
    return null
  }

  async function handleSavePersonal(input: UpdateProfileInput) {
    return applyResult(await updateProfessionalProfile(input), "Informações atualizadas.")
  }

  async function handleSaveCategories(ids: string[]) {
    return applyResult(await setProfessionalCategories(ids), "Categorias atualizadas.")
  }

  async function handleSaveCities(ids: string[]) {
    return applyResult(await setProfessionalCities(ids), "Cidades atualizadas.")
  }

  if (isLoading && !profile) {
    return <LoadingState fill />
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{error ?? "Não foi possível carregar o perfil."}</Text>
        <Button label="Tentar novamente" onPress={reload} style={styles.retry} variant="secondary" />
      </View>
    )
  }

  const ratingLabel =
    profile.ratingCount > 0
      ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount} ${
          profile.ratingCount === 1 ? "avaliação" : "avaliações"
        })`
      : "Novo profissional"

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Perfil</Text>

        {/* Cabeçalho: identidade + reputação resumida. */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.mainCategory}>{profile.mainCategory ?? "Categoria não definida"}</Text>
          <View style={styles.ratingRow}>
            <Stars rating={profile.ratingCount > 0 ? profile.ratingAverage : 0} size={16} />
            <Text style={styles.ratingLabel}>{ratingLabel}</Text>
          </View>
        </View>

        <ProfileSectionCard
          actionLabel="Editar"
          onPressAction={() => setOpenModal("personal")}
          title="Informações pessoais"
        >
          <InfoLine label="Nome de exibição" value={profile.displayName} />
          <InfoLine label="Telefone" value={profile.phone} />
          <InfoLine label="Descrição" value={profile.bio} />
        </ProfileSectionCard>

        <ProfileSectionCard
          actionLabel="Gerenciar"
          onPressAction={() => setOpenModal("categories")}
          title="Categorias atendidas"
        >
          <Chips
            emptyText="Nenhuma categoria selecionada. Toque em Gerenciar para definir sua atuação."
            items={profile.categories.map((category) => category.name)}
          />
        </ProfileSectionCard>

        <ProfileSectionCard
          actionLabel="Gerenciar"
          onPressAction={() => setOpenModal("cities")}
          title="Cidades atendidas"
        >
          <Chips
            emptyText="Nenhuma cidade selecionada. Toque em Gerenciar para escolher onde atende."
            items={profile.cities.map((city) => `${city.name}, ${city.state}`)}
          />
          <View style={styles.coverageNote}>
            <Ionicons color={colors.accent} name="information-circle-outline" size={18} />
            <Text style={styles.coverageText}>
              Você receberá oportunidades apenas das cidades selecionadas.
            </Text>
          </View>
        </ProfileSectionCard>

        <View>
          <SectionHeader title="Reputação" />
          <View style={styles.sectionBody}>
            <ReputationCard
              distribution={profile.ratingDistribution}
              ratingAverage={profile.ratingAverage}
              ratingCount={profile.ratingCount}
            />
          </View>
        </View>

        <View>
          <SectionHeader title="Avaliações dos clientes" />
          <View style={styles.sectionBody}>
            <ReviewsSection
              error={reviews.error}
              isLoading={reviews.isLoading}
              reviews={reviews.reviews}
            />
          </View>
        </View>

        <View>
          <SectionHeader title="Estatísticas" />
          <View style={styles.sectionBody}>
            <StatsSection stats={profile.stats} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(routes.blockedUsers)}
          style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="ban-outline" size={20} />
          <Text style={styles.menuLabel}>Usuários bloqueados</Text>
          <Ionicons color={colors.textTertiary} name="chevron-forward" size={18} />
        </Pressable>

        <Button
          disabled={isSubmitting}
          label={isSubmitting ? "Saindo..." : "Sair"}
          onPress={signOut}
          variant="secondary"
        />
      </ScrollView>

      {notice ? (
        <View style={[styles.notice, { top: insets.top + 8 }]}>
          <Ionicons color="#FFFFFF" name="checkmark-circle" size={18} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <PersonalInfoModal
        onClose={() => setOpenModal("none")}
        onSave={handleSavePersonal}
        profile={profile}
        visible={openModal === "personal"}
      />

      <MultiSelectModal
        onClose={() => setOpenModal("none")}
        onSave={handleSaveCategories}
        options={categories.map((category) => ({ id: category.id, label: category.name }))}
        selectedIds={profile.categories.map((category) => category.id)}
        title="Categorias atendidas"
        visible={openModal === "categories"}
      />

      <MultiSelectModal
        onClose={() => setOpenModal("none")}
        onSave={handleSaveCities}
        options={cities.map((city) => ({ id: city.id, label: `${city.name}, ${city.state}` }))}
        searchable
        selectedIds={profile.cities.map((city) => city.id)}
        title="Cidades atendidas"
        visible={openModal === "cities"}
      />
    </View>
  )
}

function InfoLine({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoEmpty]}>{value ?? "Não informado"}</Text>
    </View>
  )
}

function Chips({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <Text style={styles.chipsEmpty}>{emptyText}</Text>
  }

  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <View key={item} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 26,
    fontWeight: "700",
  },
  chip: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipsEmpty: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    gap: 18,
    paddingBottom: 32,
    paddingHorizontal: spacing.screen,
  },
  coverageNote: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coverageText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  headerCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoEmpty: {
    color: colors.textTertiary,
    fontWeight: "400",
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoLine: {
    gap: 2,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  mainCategory: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  menuItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  notice: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: "absolute",
  },
  noticeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  ratingLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  retry: {
    paddingHorizontal: 24,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  sectionBody: {
    marginTop: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
