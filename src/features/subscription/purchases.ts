import { Platform } from "react-native"

import Purchases, {
  PACKAGE_TYPE,
  type PurchasesPackage,
} from "react-native-purchases"

import type { SubscriptionPlan } from "./types"

// Camada única que fala com o RevenueCat (compra pela loja). O restante do app não
// importa o SDK diretamente. A liberação de vantagens NÃO acontece aqui: após a
// compra, quem decide é o servidor (ver service.syncSubscription). Aqui só abrimos
// a tela de pagamento da loja e reportamos o resultado.

// Chave pública do RevenueCat por plataforma (não é segredo; fica em env público
// do Expo). Sem a chave, o recurso fica indisponível e a tela informa o usuário.
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY

export function purchasesApiKey(): string | null {
  const key = Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY
  return key && key.length > 0 ? key : null
}

export function isPurchasesConfigured(): boolean {
  return purchasesApiKey() !== null
}

let configuredForUser: string | null = null

// Configura o SDK uma vez por usuário. O appUserID é o nosso userId, para o
// servidor reconciliar a assinatura pelo mesmo identificador.
export function configurePurchases(userId: string): boolean {
  const apiKey = purchasesApiKey()

  if (!apiKey) {
    return false
  }

  if (configuredForUser === userId) {
    return true
  }

  Purchases.configure({ apiKey, appUserID: userId })
  configuredForUser = userId
  return true
}

export type PlanOffer = {
  plan: SubscriptionPlan
  priceString: string
  pkg: PurchasesPackage
}

function planForPackage(pkg: PurchasesPackage): SubscriptionPlan | null {
  if (pkg.packageType === PACKAGE_TYPE.MONTHLY) return "MONTHLY"
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return "ANNUAL"
  return null
}

// Planos disponíveis, com preços vindos da loja (localizados). Retorna vazio se o
// SDK não estiver configurado ou não houver oferta atual.
export async function getPlanOffers(): Promise<PlanOffer[]> {
  if (!isPurchasesConfigured()) {
    return []
  }

  const offerings = await Purchases.getOfferings()
  const packages = offerings.current?.availablePackages ?? []

  const offers: PlanOffer[] = []

  for (const pkg of packages) {
    const plan = planForPackage(pkg)
    if (plan) {
      offers.push({ plan, priceString: pkg.product.priceString, pkg })
    }
  }

  return offers
}

export type PurchaseResult =
  | { ok: true }
  | { ok: false; cancelled: boolean }

// Abre a tela de pagamento da loja para o pacote escolhido. Não libera vantagem:
// o chamador deve, em caso de sucesso, pedir ao servidor para sincronizar.
export async function purchasePlan(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    await Purchases.purchasePackage(pkg)
    return { ok: true }
  } catch (error) {
    const cancelled = Boolean((error as { userCancelled?: boolean })?.userCancelled)
    return { ok: false, cancelled }
  }
}

// Restaura compras na loja (novo aparelho/reinstalação). Após restaurar, o chamador
// pede ao servidor para reconhecer a assinatura.
export async function restorePurchases(): Promise<boolean> {
  if (!isPurchasesConfigured()) {
    return false
  }

  await Purchases.restorePurchases()
  return true
}

// Abre a tela nativa de gerenciamento de assinatura da loja, onde o profissional
// cancela a renovação. O cancelamento é sempre feito pela loja, nunca pelo app.
export async function openStoreManagement(): Promise<void> {
  if (!isPurchasesConfigured()) {
    return
  }

  await Purchases.showManageSubscriptions()
}
