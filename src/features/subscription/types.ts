// Estado da assinatura vindo do servidor (fonte de verdade). O app só exibe; a
// decisão de vantagens é sempre do backend.

export type SubscriptionPlan = "MONTHLY" | "ANNUAL"

export type SubscriptionStatusValue =
  | "ACTIVE"
  | "IN_GRACE"
  | "CANCELED"
  | "EXPIRED"
  | "NONE"

export type SubscriptionStatus = {
  isActive: boolean
  plan: SubscriptionPlan | null
  status: SubscriptionStatusValue
  currentPeriodEnd: string | null
}

export type Certificate = {
  code: string
  issuedAt: string
  holderName: string
  disclaimer: string
  valid: boolean
}

export type SubscriptionState = {
  subscription: SubscriptionStatus
  certificate: Certificate | null
}
