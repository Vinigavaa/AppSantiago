import { appFetch, type ApiResult } from "@/lib/api-client"

import type { SubscriptionState } from "./types"

// Status autoritativo da assinatura do profissional (+ certificado quando emitido).
export async function fetchSubscriptionState(): Promise<ApiResult<SubscriptionState>> {
  return appFetch<SubscriptionState>("/professional/subscription")
}

// Chamado após concluir a compra na loja. O servidor confirma com a loja e só
// então libera as vantagens — nunca confia no app.
export async function syncSubscription(): Promise<ApiResult<SubscriptionState>> {
  return appFetch<SubscriptionState>("/professional/subscription/sync", { method: "POST" })
}

// "Restaurar compra": reconhece a assinatura existente sem nova cobrança. Retorna
// 404 (NOTHING_TO_RESTORE) quando não há assinatura ativa.
export async function restoreSubscription(): Promise<ApiResult<SubscriptionState>> {
  return appFetch<SubscriptionState>("/professional/subscription/restore", { method: "POST" })
}
