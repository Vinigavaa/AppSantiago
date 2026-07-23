import { env, revenueCatConfig } from "@/config/env"

import { planForProductId, type Plan } from "./plans"

// Cliente do RevenueCat (fonte externa de verificacao com as lojas). O servidor
// nunca confia no dispositivo: consulta aqui o estado real do assinante e so entao
// grava. Usa a REST API v2 (a chave secreta atual do RevenueCat so autentica a v2;
// a v1 responde 403). Sem REVENUECAT_API_KEY/PROJECT_ID o recurso fica inerte.

const API_BASE = "https://api.revenuecat.com/v2"

// Estado normalizado do assinante, pronto para virar um ProfessionalSubscription.
// `null` significa "sem assinatura reconhecida".
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

// Formato (parcial) do objeto de assinatura da API v2. Campos opcionais porque o
// RevenueCat nem sempre popula todos; tratamos ausencias defensivamente.
type V2Subscription = {
  id: string
  product_id?: string
  store?: string
  status?: string
  gives_access?: boolean
  auto_renewal_status?: string
  current_period_ends_at?: number | null
  grace_period_expires_at?: number | null
  store_subscription_identifier?: string | null
}

type V2SubscriptionList = { items?: V2Subscription[] }

function storeFrom(store: string | undefined): "GOOGLE_PLAY" | "APP_STORE" | "TEST_STORE" {
  if (store === "play_store") return "GOOGLE_PLAY"
  if (store === "app_store") return "APP_STORE"
  // Test Store (e qualquer origem de teste) cai aqui. Em producao as compras reais
  // sao sempre play_store/app_store, entao esse bucket so aparece em dev.
  return "TEST_STORE"
}

// A API v2 usa timestamps em milissegundos. O guard converte caso venha em segundos.
function toDate(value: number | null | undefined): Date | null {
  if (!value) return null
  const ms = value < 1e12 ? value * 1000 : value
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date
}

// Traduz a lista de assinaturas da v2 para o nosso snapshot. Exportada para teste
// sem rede. Escolhe a assinatura que concede acesso agora (`gives_access`); na
// ausencia, a de expiracao mais recente. O estado deriva de gives_access + status:
//  - sem acesso → EXPIRED
//  - em tolerancia/retentativa de cobranca → IN_GRACE
//  - renovacao desligada mas ainda com acesso → CANCELED
//  - caso contrario → ACTIVE
export function normalizeSubscriptions(data: V2SubscriptionList): SubscriberSnapshot | null {
  const items = data.items ?? []

  if (items.length === 0) {
    return null
  }

  const withAccess = items.filter((item) => item.gives_access)
  const pool = withAccess.length > 0 ? withAccess : items
  const sub = pool.reduce((best, current) =>
    (current.current_period_ends_at ?? 0) > (best.current_period_ends_at ?? 0) ? current : best,
  )

  const productId = sub.product_id
  const plan = productId ? planForProductId(productId) : null
  const currentPeriodEnd = toDate(sub.current_period_ends_at)

  if (!productId || !plan || !currentPeriodEnd) {
    return null
  }

  const store = storeFrom(sub.store)
  const givesAccess = Boolean(sub.gives_access)
  const gracePeriodEnd = toDate(sub.grace_period_expires_at)
  const canceled = sub.auto_renewal_status === "will_not_renew"

  let status: SubscriberSnapshot["status"]

  if (!givesAccess) {
    status = "EXPIRED"
  } else if (sub.status === "in_grace_period" || sub.status === "in_billing_retry") {
    status = "IN_GRACE"
  } else if (canceled) {
    status = "CANCELED"
  } else {
    status = "ACTIVE"
  }

  if (store === "TEST_STORE") {
    console.log("[revenuecat] compra de origem nao-padrao (store bruto):", sub.store)
  }

  return {
    plan,
    status,
    store,
    storeProductId: productId,
    storeTransactionId: sub.store_subscription_identifier ?? sub.id,
    currentPeriodEnd,
    gracePeriodEnd,
    autoRenew: sub.auto_renewal_status === "will_renew",
  }
}

// Consulta o estado real do assinante no RevenueCat (v2) pelo customer id, que e o
// app_user_id (usamos o userId do profissional). Lanca se nao configurado. Retorna
// null quando o cliente nao existe ou nao tem assinatura reconhecida.
export async function fetchSubscriberState(appUserId: string): Promise<SubscriberSnapshot | null> {
  if (!revenueCatConfig) {
    throw new Error("RevenueCat nao configurado (REVENUECAT_API_KEY ausente)")
  }

  if (!env.REVENUECAT_PROJECT_ID) {
    throw new Error("RevenueCat nao configurado (REVENUECAT_PROJECT_ID ausente)")
  }

  const url = `${API_BASE}/projects/${env.REVENUECAT_PROJECT_ID}/customers/${encodeURIComponent(
    appUserId,
  )}/subscriptions`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${revenueCatConfig.apiKey}`,
      "Content-Type": "application/json",
    },
  })

  // Cliente inexistente (nunca comprou/registrou): sem assinatura a reconhecer.
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`RevenueCat v2 respondeu ${response.status} ao consultar assinaturas`)
  }

  const data = (await response.json()) as V2SubscriptionList
  return normalizeSubscriptions(data)
}

// Valida a autenticidade da notificacao (webhook) do RevenueCat comparando o
// header Authorization com o secret configurado. Sem secret, nada e aceito.
export function isValidWebhookAuth(authorizationHeader: string | undefined): boolean {
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    return false
  }

  return authorizationHeader === env.REVENUECAT_WEBHOOK_SECRET
}
