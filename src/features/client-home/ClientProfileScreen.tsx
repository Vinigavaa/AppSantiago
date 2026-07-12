import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { LoadingState } from "@/components/ui/LoadingState"
import { Stars } from "@/components/ui/Stars"
import { routes } from "@/constants/routes"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { authClient } from "@/lib/auth-client"

import { ChangePasswordModal } from "./components/ChangePasswordModal"
import { ClientPersonalInfoModal } from "./components/ClientPersonalInfoModal"
import { DeleteAccountModal } from "./components/DeleteAccountModal"
import { ProfileSectionCard } from "./components/ProfileSectionCard"
import { ReputationCard } from "./components/ReputationCard"
import { ReviewList } from "./components/ReviewList"
import { SectionHeader } from "./components/SectionHeader"
import { StatCards } from "./components/StatCards"
import { getInitials } from "./greeting"
import { deleteClientAccount, updateClientProfile } from "./profile-service"
import { useClientProfile, useClientReviews } from "./profile-hooks"
import type { ClientProfileInfo, UpdateClientProfileInput } from "./profile-types"
import { colors, radius, spacing } from "./theme"

type OpenModal = "none" | "personal" | "password" | "delete"

function formatMemberSince(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function ClientProfileScreen() {
  const insets = useSafeAreaInsets()
  const { profile, isLoading, error, reload, setProfile } = useClientProfile()
  const reviews = useClientReviews()
  const { signOut, isSubmitting } = useAuth()

  const [openModal, setOpenModal] = useState<OpenModal>("none")
  const [notice, setNotice] = useState<string | null>(null)

  function showNotice(message: string) {
    setNotice(message)
    setTimeout(() => setNotice(null), 2500)
  }

  async function handleSavePersonal(input: UpdateClientProfileInput): Promise<string | null> {
    const result = await updateClientProfile(input)
    if (!result.ok) {
      return result.error
    }
    setProfile(result.data)
    showNotice("Informações atualizadas.")
    return null
  }

  async function handleChangePassword() {
    showNotice("Senha alterada com sucesso.")
  }

  // Exclusão: em sucesso, encerra a sessão local e volta ao login. O erro (ex.:
  // serviço em andamento) é devolvido ao modal, que o exibe e permanece aberto.
  async function handleDeleteAccount(): Promise<string | null> {
    const result = await deleteClientAccount()
    if (!result.ok) {
      return result.error
    }
    await authClient.signOut().catch(() => {})
    router.replace(routes.login)
    return null
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
      : "Sem avaliações ainda"

  const memberSince = formatMemberSince(profile.memberSince)

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
          {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
          {profile.mainCity ? (
            <View style={styles.metaRow}>
              <Ionicons color={colors.textSecondary} name="location-outline" size={15} />
              <Text style={styles.metaText}>
                {profile.mainCity.name}, {profile.mainCity.state}
              </Text>
            </View>
          ) : null}
          {memberSince ? <Text style={styles.memberSince}>Membro desde {memberSince}</Text> : null}
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
          <InfoLine icon="mail-outline" label="E-mail" value={profile.email} />
          <InfoLine icon="call-outline" label="Telefone" value={profile.phone} />
          <View style={styles.privacyNote}>
            <Ionicons color={colors.textSecondary} name="lock-closed-outline" size={15} />
            <Text style={styles.privacyText}>
              Seu e-mail e endereço permanecem privados e não são exibidos a outros usuários.
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
          <SectionHeader title="Avaliações recebidas" />
          <View style={styles.sectionBody}>
            <ReviewList
              emptyDescription="Quando um profissional avaliar você após um serviço concluído, os comentários aparecerão aqui."
              emptyTitle="Você ainda não recebeu avaliações."
              error={reviews.error}
              isLoading={reviews.isLoading}
              reviews={reviews.reviews}
            />
          </View>
        </View>

        <View>
          <SectionHeader title="Estatísticas" />
          <View style={styles.sectionBody}>
            <ClientStatsCards profile={profile} />
          </View>
        </View>

        <View>
          <SectionHeader title="Configurações" />
          <View style={styles.sectionBody}>
            <View style={styles.menuGroup}>
              <MenuItem
                icon="key-outline"
                label="Alterar senha"
                onPress={() => setOpenModal("password")}
              />
              <View style={styles.divider} />
              <MenuItem
                icon="ban-outline"
                label="Usuários bloqueados"
                onPress={() => router.push(routes.blockedUsers)}
              />
            </View>
          </View>
        </View>

        <View style={styles.accountActions}>
          <Button
            disabled={isSubmitting}
            label={isSubmitting ? "Saindo..." : "Sair"}
            onPress={signOut}
            variant="secondary"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpenModal("delete")}
            style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
          >
            <Ionicons color={colors.danger} name="trash-outline" size={18} />
            <Text style={styles.deleteLinkText}>Excluir minha conta</Text>
          </Pressable>
        </View>
      </ScrollView>

      {notice ? (
        <View style={[styles.notice, { top: insets.top + 8 }]}>
          <Ionicons color="#FFFFFF" name="checkmark-circle" size={18} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ClientPersonalInfoModal
        onClose={() => setOpenModal("none")}
        onSave={handleSavePersonal}
        profile={profile}
        visible={openModal === "personal"}
      />

      <ChangePasswordModal
        onClose={() => setOpenModal("none")}
        onSuccess={handleChangePassword}
        visible={openModal === "password"}
      />

      <DeleteAccountModal
        onClose={() => setOpenModal("none")}
        onConfirm={handleDeleteAccount}
        visible={openModal === "delete"}
      />
    </View>
  )
}

function ClientStatsCards({ profile }: { profile: ClientProfileInfo }) {
  const { requestsCreated, servicesCompleted, professionalsHired } = profile.stats

  if (requestsCreated === 0 && servicesCompleted === 0 && professionalsHired === 0) {
    return (
      <View style={styles.statsEmpty}>
        <Text style={styles.statsEmptyText}>
          Suas estatísticas aparecerão aqui após criar solicitações e contratar serviços.
        </Text>
      </View>
    )
  }

  return (
    <StatCards
      items={[
        { label: "Solicitações", value: requestsCreated },
        { label: "Concluídos", value: servicesCompleted },
        { label: "Contratados", value: professionalsHired },
      ]}
    />
  )
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string | null
}) {
  return (
    <View style={styles.infoLine}>
      <Ionicons color={colors.textTertiary} name={icon} size={18} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, !value && styles.infoEmpty]}>{value ?? "Não informado"}</Text>
      </View>
    </View>
  )
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
    >
      <Ionicons color={colors.textPrimary} name={icon} size={20} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons color={colors.textTertiary} name="chevron-forward" size={18} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  accountActions: {
    gap: 14,
    marginTop: 4,
  },
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
  content: {
    gap: 18,
    paddingBottom: 32,
    paddingHorizontal: spacing.screen,
  },
  deleteLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 6,
  },
  deleteLinkText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    backgroundColor: colors.cardBorder,
    height: 1,
    marginLeft: 48,
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
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  infoText: {
    flex: 1,
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
  memberSince: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    alignItems: "center",
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
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
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
  privacyNote: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  privacyText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
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
  statsEmpty: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  statsEmptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  username: {
    color: colors.textSecondary,
    fontSize: 14,
  },
})
