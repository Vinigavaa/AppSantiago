import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import { Button } from "@/components/ui/Button"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { colors, radius, spacing, status, typography } from "@/features/client-home/theme"

import { useSubscription } from "./hooks"
import { openStoreManagement } from "./purchases"
import type { PlanOffer } from "./purchases"
import type { SubscriptionPlan } from "./types"

// Links obrigatorios (Apple/Google) perto da compra. Configuraveis por env; padrao
// aponta para o dominio de producao — crie as paginas antes de publicar.
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? "https://appsantiago.onrender.com/termos"
const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://appsantiago.onrender.com/privacidade"

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  MONTHLY: "Mensal",
  ANNUAL: "Anual",
}

const BENEFITS = [
  "Apareça em destaque no topo das buscas",
  "Selo de destaque no seu perfil",
  "Propostas ilimitadas (sem limite mensal)",
  "Certificado de participação verificável",
]

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("pt-BR")
}

export function SubscriptionScreen() {
  const router = useRouter()
  const {
    state,
    offers,
    isLoading,
    busyPlan,
    isRestoring,
    error,
    notice,
    purchasesAvailable,
    buy,
    restore,
  } = useSubscription()

  const isActive = state?.subscription.isActive ?? false
  const certificate = state?.certificate ?? null

  return (
    <View style={styles.container}>
      <ScreenHeader title="Assine e apareça em destaque" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {isActive ? (
              <ActiveCard
                planLabel={state?.subscription.plan ? PLAN_LABEL[state.subscription.plan] : "-"}
                statusValue={state?.subscription.status ?? "ACTIVE"}
                periodEnd={formatDate(state?.subscription.currentPeriodEnd ?? null)}
              />
            ) : (
              <BenefitsCard />
            )}

            {certificate ? (
              <CertificateCard
                code={certificate.code}
                holderName={certificate.holderName}
                issuedAt={formatDate(certificate.issuedAt)}
                valid={certificate.valid}
                disclaimer={certificate.disclaimer}
              />
            ) : null}

            {!isActive ? (
              <>
                {!purchasesAvailable ? (
                  <Text style={styles.muted}>
                    Pagamentos indisponíveis neste dispositivo no momento.
                  </Text>
                ) : offers.length === 0 ? (
                  <Text style={styles.muted}>Não foi possível carregar os planos agora.</Text>
                ) : (
                  offers.map((offer) => (
                    <PlanCard
                      key={offer.plan}
                      offer={offer}
                      loading={busyPlan === offer.plan}
                      disabled={busyPlan !== null}
                      onPress={() => buy(offer.plan)}
                    />
                  ))
                )}

                <LegalText />
              </>
            ) : (
              <Button
                label="Gerenciar assinatura na loja"
                variant="secondary"
                icon="settings-outline"
                onPress={() => {
                  void openStoreManagement()
                }}
              />
            )}

            <Button
              label="Restaurar compra"
              variant="ghost"
              loading={isRestoring}
              disabled={!purchasesAvailable || busyPlan !== null}
              onPress={() => {
                void restore()
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  )
}

function BenefitsCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Vantagens da assinatura</Text>
      {BENEFITS.map((benefit) => (
        <View key={benefit} style={styles.benefitRow}>
          <Ionicons color={colors.primary} name="checkmark-circle" size={18} />
          <Text style={styles.benefitText}>{benefit}</Text>
        </View>
      ))}
    </View>
  )
}

function ActiveCard({
  planLabel,
  statusValue,
  periodEnd,
}: {
  planLabel: string
  statusValue: string
  periodEnd: string
}) {
  const statusText =
    statusValue === "IN_GRACE"
      ? "Em tolerância (regularize o pagamento na loja)"
      : statusValue === "CANCELED"
        ? "Renovação cancelada — ativa até o fim do período"
        : "Ativa"

  return (
    <View style={[styles.card, styles.activeCard]}>
      <View style={styles.benefitRow}>
        <Ionicons color={status.success.color} name="star" size={18} />
        <Text style={styles.cardTitle}>Assinatura {planLabel.toLowerCase()}</Text>
      </View>
      <Text style={styles.activeStatus}>{statusText}</Text>
      <Text style={styles.muted}>Válida até {periodEnd}</Text>
    </View>
  )
}

function CertificateCard({
  code,
  holderName,
  issuedAt,
  valid,
  disclaimer,
}: {
  code: string
  holderName: string
  issuedAt: string
  valid: boolean
  disclaimer: string
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Certificado de participação</Text>
      <Text style={styles.certName}>{holderName}</Text>
      <Text style={styles.muted}>Emitido em {issuedAt}</Text>
      <Text style={styles.certCode}>Código: {code}</Text>
      <View
        style={[
          styles.badge,
          { backgroundColor: valid ? status.success.background : status.danger.background },
        ]}
      >
        <Text
          style={[styles.badgeText, { color: valid ? status.success.color : status.danger.color }]}
        >
          {valid ? "Válido" : "Inválido"}
        </Text>
      </View>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </View>
  )
}

function PlanCard({
  offer,
  loading,
  disabled,
  onPress,
}: {
  offer: PlanOffer
  loading: boolean
  disabled: boolean
  onPress: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.planHeader}>
        <Text style={styles.cardTitle}>Plano {PLAN_LABEL[offer.plan]}</Text>
        {offer.plan === "ANNUAL" ? (
          <View style={[styles.badge, { backgroundColor: status.info.background }]}>
            <Text style={[styles.badgeText, { color: status.info.color }]}>Melhor preço</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.price}>{offer.priceString}</Text>
      <Button
        label="Assinar"
        loading={loading}
        disabled={disabled}
        onPress={onPress}
      />
    </View>
  )
}

function LegalText() {
  return (
    <Text style={styles.legal}>
      A assinatura é cobrada pela loja e{" "}
      <Text style={styles.legalStrong}>renova automaticamente até ser cancelada</Text>. Cancele a
      qualquer momento na própria loja; as vantagens seguem até o fim do período pago. Ao assinar,
      você concorda com os{" "}
      <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
        Termos de Uso
      </Text>{" "}
      e a{" "}
      <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
        Política de Privacidade
      </Text>
      .
    </Text>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.card,
  },
  activeCard: {
    borderColor: status.success.color,
  },
  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  benefitText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  activeStatus: {
    ...typography.subtitle,
    color: status.success.color,
  },
  muted: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  planHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  price: {
    ...typography.display,
    color: colors.textPrimary,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.tag,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.micro,
    fontWeight: "700",
  },
  certName: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  certCode: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  disclaimer: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  legal: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  legalStrong: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  link: {
    color: colors.highlight,
    textDecorationLine: "underline",
  },
  notice: {
    ...typography.body,
    backgroundColor: status.success.background,
    borderRadius: radius.control,
    color: status.success.color,
    padding: spacing.md,
  },
  error: {
    ...typography.body,
    backgroundColor: status.danger.background,
    borderRadius: radius.control,
    color: status.danger.color,
    padding: spacing.md,
  },
})
