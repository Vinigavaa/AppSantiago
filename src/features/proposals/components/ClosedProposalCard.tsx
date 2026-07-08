import { Ionicons } from "@expo/vector-icons"
import { Image, StyleSheet, Text, View } from "react-native"

import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatRelativeTime } from "@/features/service-requests/format"

import { formatProposalPrice, getProposalStatusStyle } from "../format"
import type { ReceivedProposal } from "../types"

type Props = {
  proposal: ReceivedProposal
}

// Card da aba "Recusadas": propostas encerradas (recusadas pelo cliente ou
// canceladas). Apenas histórico — sem ações.
//
// Caso especial: o profissional desistir de um serviço que já havia sido aceito.
// Aqui o cancelamento partiu dele (não do cliente nem do sistema), então o card
// ganha um destaque explícito para não gerar dúvida.
export function ClosedProposalCard({ proposal }: Props) {
  const { professional, contract } = proposal
  const status = getProposalStatusStyle(proposal.status)

  const canceledByProfessional =
    proposal.status === "CANCELED" && contract?.canceledBy === "PROFESSIONAL"

  return (
    <View style={[styles.card, canceledByProfessional && styles.cardAlert]}>
      {canceledByProfessional ? (
        <View style={styles.alert}>
          <Ionicons color={alertColor} name="alert-circle" size={18} />
          <Text style={styles.alertTitle}>O profissional cancelou este serviço</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        {professional.avatarUrl ? (
          <Image source={{ uri: professional.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(professional.name)}</Text>
          </View>
        )}

        <View style={styles.headerText}>
          <Text style={styles.name}>{professional.name}</Text>
          <Text numberOfLines={1} style={styles.serviceTitle}>
            {proposal.serviceRequest.category} · {proposal.serviceRequest.title}
          </Text>
        </View>

        {canceledByProfessional ? (
          <View style={[styles.statusPill, styles.statusPillAlert]}>
            <Text style={[styles.statusText, { color: alertColor }]}>Cancelada</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>{formatProposalPrice(proposal.price)}</Text>
        <Text style={styles.date}>Recebida {formatRelativeTime(proposal.createdAt)}</Text>
      </View>
    </View>
  )
}

// Tom âmbar de atenção (mesma família usada em "Em andamento"), para sinalizar
// que algo mudou sem transmitir erro ou culpa do cliente.
const alertColor = "#92600A"
const alertBg = "#FBF1DD"
const alertBorder = "#EAD3A2"

const styles = StyleSheet.create({
  alert: {
    alignItems: "center",
    backgroundColor: alertBg,
    borderRadius: radius.tag,
    flexDirection: "row",
    gap: 6,
    padding: 12,
  },
  alertTitle: {
    color: alertColor,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    opacity: 0.9,
    padding: spacing.card,
  },
  // Cancelamento pelo profissional: card em destaque (borda âmbar, sem esmaecer)
  // para separá-lo das demais propostas encerradas.
  cardAlert: {
    borderColor: alertBorder,
    opacity: 1,
  },
  date: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  price: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  serviceTitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillAlert: {
    backgroundColor: alertBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
})
