import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import { Button } from "@/components/ui/Button"
import { openLegalPage, PRIVACY_URL, TERMS_URL } from "@/constants/legal"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { colors, radius, spacing, status, typography } from "@/features/client-home/theme"

import { useSubscription } from "./hooks"
import { openStoreManagement } from "./purchases"
import type { PlanOffer } from "./purchases"
import type { SubscriptionPlan } from "./types"

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  BIMONTHLY: "Bimestral",
  MONTHLY: "Mensal",
  ANNUAL: "Anual",
}

// Duração de cada período pago, exibida junto do preço. A App Store exige que a
// tela informe preço e duração antes da compra.
const PLAN_PERIOD: Record<SubscriptionPlan, string> = {
  BIMONTHLY: "a cada 2 meses",
  MONTHLY: "por mês",
  ANNUAL: "por ano",
}

// Preço de referência do plano vendido hoje. O valor exibido é sempre o da loja
// (localizado); esta constante só evita uma tela sem preço caso a oferta não
// carregue — precisa acompanhar o preço cadastrado nas lojas.
const FALLBACK_PRICE = "R$ 4,90"

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

  // Só existe um plano à venda. Se a loja não devolveu a oferta, ainda mostramos o
  // cartão com o preço de referência para o profissional saber o que está comprando.
  const offer = offers.find((item) => item.plan === "BIMONTHLY") ?? null

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
              <>
                <ActiveCard
                  planLabel={state?.subscription.plan ? PLAN_LABEL[state.subscription.plan] : "-"}
                  statusValue={state?.subscription.status ?? "ACTIVE"}
                  periodEnd={formatDate(state?.subscription.currentPeriodEnd ?? null)}
                />

                <Button
                  label="Gerenciar assinatura na loja"
                  variant="secondary"
                  icon="settings-outline"
                  onPress={() => {
                    void openStoreManagement()
                  }}
                />
              </>
            ) : (
              <>
                <PlanCard
                  offer={offer}
                  loading={busyPlan !== null}
                  disabled={!purchasesAvailable || offer === null || busyPlan !== null}
                  onPress={() => buy("BIMONTHLY")}
                />

                {!purchasesAvailable ? (
                  <Text style={styles.muted}>
                    Pagamentos indisponíveis neste dispositivo no momento.
                  </Text>
                ) : offer === null ? (
                  <Text style={styles.muted}>Não foi possível carregar o plano agora.</Text>
                ) : null}

                <RenewalTerms />
              </>
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

            <Button
              label="Restaurar compra"
              variant="ghost"
              loading={isRestoring}
              disabled={!purchasesAvailable || busyPlan !== null}
              onPress={() => {
                void restore()
              }}
            />

            <LegalLinks />
          </>
        )}
      </ScrollView>
    </View>
  )
}

// Cartão principal da tela: preço, duração do período e o que a assinatura inclui.
function PlanCard({
  offer,
  loading,
  disabled,
  onPress,
}: {
  offer: PlanOffer | null
  loading: boolean
  disabled: boolean
  onPress: () => void
}) {
  return (
    <View style={[styles.card, styles.planCard]}>
      <View style={[styles.badge, { backgroundColor: status.info.background }]}>
        <Text style={[styles.badgeText, { color: status.info.color }]}>Plano bimestral</Text>
      </View>

      <Text style={styles.cardTitle}>Destaque Santiago</Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{offer?.priceString ?? FALLBACK_PRICE}</Text>
        <Text style={styles.pricePeriod}>{PLAN_PERIOD.BIMONTHLY}</Text>
      </View>

      <Text style={styles.muted}>
        Acesso por 2 meses. Renova automaticamente por {offer?.priceString ?? FALLBACK_PRICE} a cada
        2 meses até você cancelar.
      </Text>

      <View style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Ionicons color={colors.primary} name="checkmark-circle" size={18} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <Button label="Assinar por 2 meses" loading={loading} disabled={disabled} onPress={onPress} />
    </View>
  )
}

// Condições que a App Store exige na própria tela de compra.
function RenewalTerms() {
  return (
    <View style={styles.terms}>
      <TermRow label="Duração" value="2 meses por período" />
      <TermRow label="Renovação" value="Automática a cada 2 meses" />
      <TermRow
        label="Cancelamento"
        value="A qualquer momento nos ajustes da sua conta na loja, até 24 horas antes do fim do período"
      />
      <Text style={styles.legal}>
        A cobrança é feita pela loja na confirmação da compra. As vantagens seguem até o fim do
        período já pago, mesmo após o cancelamento.
      </Text>
    </View>
  )
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.termRow}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={styles.termValue}>{value}</Text>
    </View>
  )
}

function LegalLinks() {
  return (
    <Text style={styles.legal}>
      Ao assinar, você concorda com os{" "}
      <Text style={styles.link} onPress={() => openLegalPage(TERMS_URL)}>
        Termos de Uso
      </Text>{" "}
      e a{" "}
      <Text style={styles.link} onPress={() => openLegalPage(PRIVACY_URL)}>
        Política de Privacidade
      </Text>
      .
    </Text>
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
  planCard: {
    borderColor: colors.primary,
  },
  activeCard: {
    borderColor: status.success.color,
  },
  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  priceRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  price: {
    ...typography.display,
    color: colors.textPrimary,
  },
  pricePeriod: {
    ...typography.body,
    color: colors.textSecondary,
  },
  benefits: {
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  terms: {
    gap: spacing.sm,
  },
  termRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  termLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    width: 108,
  },
  termValue: {
    ...typography.caption,
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
