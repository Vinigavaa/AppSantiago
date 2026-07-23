import type { Context } from "hono"

import { revenueCatConfig } from "@/config/env"
import { getOwnCertificate } from "@/modules/certificates/service"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { getEntitlementByUserId, type Entitlement } from "./entitlement"
import { isValidWebhookAuth } from "./revenuecat"
import { syncSubscriptionFromStore } from "./service"

function forbidden(context: AuthedContext, message: string) {
  return context.json({ code: "FORBIDDEN", message }, 403)
}

// RevenueCat indisponivel/nao configurado: respondemos 503 para o app diferenciar
// de um erro real e poder tentar de novo, sem liberar nada.
function storeUnavailable(context: AuthedContext) {
  return context.json(
    { code: "STORE_UNAVAILABLE", message: "Pagamentos indisponiveis no momento. Tente novamente." },
    503,
  )
}

// Serializa o entitlement para a resposta da API. `isActive` e o que o app usa para
// mostrar o estado; as vantagens em si continuam decididas no servidor.
function serializeEntitlement(entitlement: Entitlement) {
  return {
    isActive: entitlement.isActive,
    plan: entitlement.plan,
    status: entitlement.status,
    currentPeriodEnd: entitlement.currentPeriodEnd?.toISOString() ?? null,
  }
}

// GET /professional/subscription — status autoritativo da assinatura do profissional.
export async function subscriptionStatusHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context, "Disponivel apenas para profissionais.")
  }

  const [entitlement, certificate] = await Promise.all([
    getEntitlementByUserId(user.id),
    getOwnCertificate(user.id),
  ])

  return context.json({
    subscription: serializeEntitlement(entitlement),
    // Certificado do profissional (quando emitido). `valid` é derivado do status
    // atual da assinatura, para nunca ficar dessincronizado.
    certificate: certificate
      ? {
          code: certificate.code,
          issuedAt: certificate.issuedAt.toISOString(),
          holderName: certificate.holderName,
          disclaimer: certificate.disclaimer,
          valid: entitlement.isActive,
        }
      : null,
  })
}

// POST /professional/subscription/sync — chamado pelo app apos concluir a compra na
// loja. NUNCA confia no app: dispara a consulta ao RevenueCat e persiste o que ele
// confirmar. As vantagens so aparecem se a loja confirmar o pagamento.
export async function syncSubscriptionHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context, "Disponivel apenas para profissionais.")
  }

  if (!revenueCatConfig) {
    return storeUnavailable(context)
  }

  try {
    const result = await syncSubscriptionFromStore(user.id, "purchase")

    if (!result.ok) {
      return forbidden(context, "Complete seu perfil profissional para assinar.")
    }

    return context.json({ subscription: serializeEntitlement(result.entitlement) })
  } catch (error) {
    console.error("[subscriptions] falha ao sincronizar compra", error)
    return storeUnavailable(context)
  }
}

// POST /professional/subscription/restore — "Restaurar compra". Reconfirma com a
// loja e reativa sem nova cobranca. Se nada estiver ativo, informa que nao ha o
// que restaurar (sem liberar vantagem).
export async function restoreSubscriptionHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context, "Disponivel apenas para profissionais.")
  }

  if (!revenueCatConfig) {
    return storeUnavailable(context)
  }

  try {
    const result = await syncSubscriptionFromStore(user.id, "restore")

    if (!result.ok) {
      return forbidden(context, "Complete seu perfil profissional para assinar.")
    }

    if (!result.entitlement.isActive) {
      return context.json(
        { code: "NOTHING_TO_RESTORE", message: "Nenhuma assinatura ativa para restaurar." },
        404,
      )
    }

    return context.json({ subscription: serializeEntitlement(result.entitlement) })
  } catch (error) {
    console.error("[subscriptions] falha ao restaurar compra", error)
    return storeUnavailable(context)
  }
}

// POST /webhooks/revenuecat — notificacao de servidor do RevenueCat. Fora do grupo
// autenticado do app. Valida o secret; para cada evento, reconsulta o estado real e
// persiste (nao confia no payload como fonte). Sempre 200 quando aceito, para o
// RevenueCat nao reenfileirar indefinidamente.
export async function revenueCatWebhookHandler(context: Context) {
  if (!isValidWebhookAuth(context.req.header("Authorization"))) {
    return context.json({ code: "UNAUTHORIZED", message: "Assinatura invalida." }, 401)
  }

  const body = (await context.req.json().catch(() => null)) as
    | { event?: { app_user_id?: string; type?: string } }
    | null

  const appUserId = body?.event?.app_user_id

  if (!appUserId) {
    return context.json({ ok: true })
  }

  try {
    await syncSubscriptionFromStore(appUserId, `webhook:${body?.event?.type ?? "unknown"}`)
  } catch (error) {
    console.error("[subscriptions] falha ao processar webhook", error)
    // 500 para o RevenueCat reenviar depois (o processamento e idempotente).
    return context.json({ code: "INTERNAL", message: "Falha ao processar." }, 500)
  }

  return context.json({ ok: true })
}
