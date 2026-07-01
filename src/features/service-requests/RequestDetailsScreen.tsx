import { Ionicons } from "@expo/vector-icons"
import { type Href, router } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { routes } from "@/constants/routes"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { CancelServiceModal } from "@/features/contracts/CancelServiceModal"
import { ReviewModal } from "@/features/service-requests/components/ReviewModal"
import {
  formatBudget,
  formatEditedAt,
  formatFullDate,
  getStatusStyle,
  getUrgencyLabel,
  wasEdited,
} from "@/features/service-requests/format"
import { useServiceRequestDetail } from "@/features/service-requests/hooks"
import { deleteServiceRequest } from "@/features/service-requests/service"
import type { RequestContract } from "@/features/service-requests/types"

// Status em que a solicitação não pode mais ser editada.
const LOCKED_STATUSES = ["COMPLETED", "CANCELED"] as const

export function RequestDetailsScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets()
  const { request, isLoading, isRefreshing, error, refetch } = useServiceRequestDetail(id)

  const [isDeleting, setIsDeleting] = useState(false)
  const [reviewContract, setReviewContract] = useState<RequestContract | null>(null)
  const [cancelContractId, setCancelContractId] = useState<string | null>(null)

  function handleEdit() {
    router.push(`${routes.editRequest}?id=${id}` as Href)
  }

  function confirmDelete() {
    Alert.alert(
      "Excluir solicitação",
      "Esta ação é irreversível. A solicitação e as propostas recebidas serão removidas.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => void runDelete() },
      ],
    )
  }

  async function runDelete() {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)
    const result = await deleteServiceRequest(id)
    setIsDeleting(false)

    if (result.ok) {
      Alert.alert("Solicitação excluída", "Sua solicitação foi removida com sucesso.")
      router.replace(routes.home)
      return
    }

    Alert.alert("Não foi possível excluir", result.error)
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalhes da solicitação</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}
      </ScrollView>
    </View>
  )

  function renderBody() {
    if (isLoading && !request) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
    }

    if (!request) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Solicitação não encontrada."}</Text>
          <Button label="Tentar novamente" onPress={refetch} style={styles.retry} variant="secondary" />
        </View>
      )
    }

    const status = getStatusStyle(request.status)
    const edited = wasEdited(request.createdAt, request.updatedAt)
    const canEdit = !(LOCKED_STATUSES as readonly string[]).includes(request.status)
    // Excluível quando não há contrato ativo. Solicitações canceladas mantêm um
    // contrato CANCELADO, mas ainda podem ser excluídas.
    const canDelete = request.contract === null || request.contract.status === "CANCELED"
    const contract = request.contract
    const canReview = contract?.status === "COMPLETED" && !contract.reviewed
    const canCancelService =
      contract?.status === "ACCEPTED" || contract?.status === "IN_PROGRESS"
    const address = request.address

    return (
      <>
        <View style={styles.topRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{request.category.name}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.title}>{request.title}</Text>

        {edited ? (
          <View style={styles.editedBadge}>
            <Ionicons color={colors.textSecondary} name="create-outline" size={14} />
            <Text style={styles.editedText}>Editada · {formatEditedAt(request.updatedAt)}</Text>
          </View>
        ) : null}

        <Section title="Descrição">
          <Text style={styles.description}>{request.description}</Text>
        </Section>

        {request.photos.length > 0 ? (
          <Section title="Fotos">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
              {request.photos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
              ))}
            </ScrollView>
          </Section>
        ) : null}

        <Section title="Endereço">
          <Text style={styles.addressLine}>
            {[address.street, address.number].filter(Boolean).join(", ") || "Não informado"}
          </Text>
          {address.complement ? (
            <Text style={styles.addressMuted}>{address.complement}</Text>
          ) : null}
          <Text style={styles.addressMuted}>
            {[address.neighborhood, `${request.city.name} - ${request.city.state}`]
              .filter(Boolean)
              .join(", ")}
          </Text>
          {address.zipCode ? <Text style={styles.addressMuted}>CEP {address.zipCode}</Text> : null}
          <View style={styles.addressNote}>
            <Ionicons color={colors.accent} name="lock-closed-outline" size={14} />
            <Text style={styles.addressNoteText}>
              Visível apenas para você. Liberado ao profissional após a contratação.
            </Text>
          </View>
        </Section>

        <Section title="Histórico">
          <InfoLine label="Criada em" value={formatFullDate(request.createdAt)} />
          {edited ? (
            <InfoLine label="Última atualização" value={formatEditedAt(request.updatedAt)} />
          ) : null}
          <InfoLine
            label="Propostas recebidas"
            value={String(request.proposalsCount)}
          />
          <InfoLine label="Urgência" value={getUrgencyLabel(request.urgency)} />
          <InfoLine label="Orçamento" value={formatBudget(request.budgetMin, request.budgetMax)} />
          <InfoLine label="Status" value={status.label} />
        </Section>

        {contract ? (
          <Section title="Contratação">
            <InfoLine label="Profissional" value={contract.professionalName} />
            <InfoLine label="Situação" value={getStatusStyle(request.status).label} />

            {canReview ? (
              <Button
                label="Avaliar profissional"
                onPress={() => setReviewContract(contract)}
                style={styles.actionSpacing}
                variant="secondary"
              />
            ) : null}

            {canCancelService ? (
              <Pressable
                onPress={() => setCancelContractId(contract.id)}
                style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
              >
                <Text style={styles.dangerText}>Cancelar serviço</Text>
              </Pressable>
            ) : null}
          </Section>
        ) : null}

        <View style={styles.actions}>
          {canEdit ? (
            <Button label="Editar solicitação" onPress={handleEdit} />
          ) : null}

          {canDelete ? (
            <Pressable
              disabled={isDeleting}
              onPress={confirmDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.pressed,
                isDeleting && styles.pressed,
              ]}
            >
              <Ionicons color={colors.danger} name="trash-outline" size={18} />
              <Text style={styles.deleteText}>
                {isDeleting ? "Excluindo..." : "Excluir solicitação"}
              </Text>
            </Pressable>
          ) : null}

          {!canDelete ? (
            <Text style={styles.deleteHint}>
              Solicitações já contratadas não podem ser excluídas.
            </Text>
          ) : null}
        </View>

        {reviewContract ? (
          <ReviewModal
            contract={reviewContract}
            onClose={() => setReviewContract(null)}
            onReviewed={refetch}
          />
        ) : null}

        {cancelContractId ? (
          <CancelServiceModal
            contractId={cancelContractId}
            onCanceled={refetch}
            onClose={() => setCancelContractId(null)}
          />
        ) : null}
      </>
    )
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  actionSpacing: {
    marginTop: 12,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  addressLine: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  addressMuted: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  addressNote: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressNoteText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  centered: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 60,
  },
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  dangerButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: radius.search,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 12,
  },
  dangerText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: radius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  deleteHint: {
    color: colors.textTertiary,
    fontSize: 13,
    textAlign: "center",
  },
  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  editedBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    marginTop: -6,
  },
  editedText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  infoLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  photo: {
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.tag,
    height: 110,
    marginRight: 10,
    width: 140,
  },
  photos: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  retry: {
    paddingHorizontal: 24,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: spacing.card,
  },
  sectionBody: {
    gap: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tag: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "500",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
})
