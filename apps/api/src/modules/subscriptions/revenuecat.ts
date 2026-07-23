import { env, revenueCatConfig } from "@/config/env"

import { ENTITLEMENT_ID, planForProductId, type Plan } from "./plans"

// Cliente do RevenueCat (fonte externa de verificacao com as lojas). O servidor
// nunca confia no dispositivo: ele consulta aqui o estado real do assinante e so
// entao grava. Sem REVENUECAT_API_KEY o recurso fica inerte (retorna null), do
// mesmo modo que os uploads sem Cloudinary — a API sobe normalmente.

const API_BASE = "https://api.revenuecat.com/v1"

// Estado normalizado do assinante, pronto para virar um ProfessionalSubscription.
// `null` de fetchSubscriberState significa "sem assinatura reconhecida".
export type SubscriberSnapshot = {
  plan: Plan
  status: "ACTIVE" | "IN_GRACE" | "CANCELED" | "EXPIRED"
  store: "GOOGLE_PLAY" | "APP_STORE" | "TEST_STORE"
  storeProductId: string
  storeTransactionId: string
  currentPeriodEnd: Date
  gracePeriodEnd: Date | null
  autoRenew: boolean
}

type RcSubscription = {
  store?: string
  expires_date?: string | null
  grace_period_expires_date?: string | null
  unsubscribe_detected_at?: string | null
  billing_issues_detected_at?: string | null
  store_transaction_id?: string | null
  original_purchase_date?: string | null
}

type RcSubscriber = {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }>
    subscriptions?: Record<string, RcSubscription>
  }
}

function storeFrom(store: string | undefined): "GOOGLE_PLAY" | "APP_STORE" | "TEST_STORE" {
  if (store === "play_store") return "GOOGLE_PLAY"
  if (store === "app_store") return "APP_STORE"
  // Test Store (e qualquer origem de teste) cai aqui. Em producao as compras reais
  // sao sempre play_store/app_store, entao esse bucket so aparece em dev.
  return "TEST_STORE"
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// Traduz o objeto do RevenueCat para o nosso snapshot. Exportada para ser testada
// sem rede. Decide o estado a partir dos sinais do RevenueCat:
//  - sem entitlement premium ou ja expirado → EXPIRED
//  - problema de cobranca + tolerancia no futuro → IN_GRACE
//  - renovacao desligada (unsubscribe) mas periodo vigente → CANCELED
//  - caso contrario → ACTIVE
export function normalizeSubscriber(data: RcSubscriber): SubscriberSnapshot | null {
  const subscriber = data.subscriber
  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID]
  const productId = entitlement?.product_identifier

  if (!productId) {
    return null
  }

  const plan = planForProductId(productId)
  const subscription = subscriber?.subscriptions?.[productId]

  if (!plan || !subscription) {
    return null
  }

  const store = storeFrom(subscription.store)
  const currentPeriodEnd = parseDate(subscription.expires_date)

  if (!currentPeriodEnd) {
    return null
  }

  // Log do valor bruto de store enquanto testamos com a Test Store — ajuda a
  // confirmar o identificador real que o RevenueCat envia.
  if (store === "TEST_STORE") {
    console.log("[revenuecat] compra de origem nao-padrao (store bruto):", subscription.store)
  }

  const now = Date.now()
  const gracePeriodEnd = parseDate(subscription.grace_period_expires_date)
  const hasBillingIssue = Boolean(subscription.billing_issues_detected_at)
  const canceled = Boolean(subscription.unsubscribe_detected_at)

  let status: SubscriberSnapshot["status"]

  if (currentPeriodEnd.getTime() <= now && !(gracePeriodEnd && gracePeriodEnd.getTime() > now)) {
    status = "EXPIRED"
  } else if (hasBillingIssue && gracePeriodEnd && gracePeriodEnd.getTime() > now) {
    status = "IN_GRACE"
  } else if (canceled) {
    status = "CANCELED"
  } else {
    status = "ACTIVE"
  }

  return {
    plan,
    status,
    store,
    storeProductId: productId,
    // Preferimos o id de transacao da loja; sem ele, um composto estavel serve de
    // chave de deduplicacao (o vinculo real e 1:1 pelo perfil profissional).
    storeTransactionId:
      subscription.store_transaction_id ??
      `${store}:${productId}:${subscription.original_purchase_date ?? "unknown"}`,
    currentPeriodEnd,
    gracePeriodEnd,
    autoRenew: !canceled,
  }
}

// Consulta o estado real do assinante no RevenueCat pelo app_user_id (usamos o
// userId do profissional). Lanca se nao configurado — o chamador decide como
// responder. Retorna null quando o RevenueCat nao reconhece assinatura.
export async function fetchSubscriberState(appUserId: string): Promise<SubscriberSnapshot | null> {
  if (!revenueCatConfig) {
    throw new Error("RevenueCat nao configurado (REVENUECAT_API_KEY ausente)")
  }

  const response = await fetch(`${API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${revenueCatConfig.apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`RevenueCat respondeu ${response.status} ao consultar assinante`)
  }

  const data = (await response.json()) as RcSubscriber
  return normalizeSubscriber(data)
}

// Valida a autenticidade da notificacao (webhook) do RevenueCat comparando o
// header Authorization com o secret configurado. Sem secret, nada e aceito.
export function isValidWebhookAuth(authorizationHeader: string | undefined): boolean {
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    return false
  }

  return authorizationHeader === env.REVENUECAT_WEBHOOK_SECRET
}
