import { prisma } from "@santiago/database"

import { emitCertificateIfNeeded } from "@/modules/certificates/service"

import { getEntitlementByProfessionalId, isSubscriptionActive, type Entitlement } from "./entitlement"
import { fetchSubscriberState } from "./revenuecat"

// Ponto unico onde a verdade da loja vira estado no banco. Compra, restore,
// webhook e reconciliacao chamam esta funcao: nenhuma delas grava direto. O fluxo
// e sempre "consultar o RevenueCat e persistir o que ele confirmar" — o payload do
// dispositivo (ou ate do webhook) nunca e a fonte; ele so dispara a sincronizacao.

export type SyncResult =
  | { ok: false; reason: "no-professional" }
  | { ok: true; entitlement: Entitlement }

// Sincroniza a assinatura do usuario com o estado real no RevenueCat e devolve o
// entitlement resultante. `reason` alimenta a trilha de auditoria (SubscriptionEvent).
export async function syncSubscriptionFromStore(
  userId: string,
  reason: string,
): Promise<SyncResult> {
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId },
    select: { id: true, user: { select: { name: true } } },
  })

  if (!professional) {
    return { ok: false, reason: "no-professional" }
  }

  const snapshot = await fetchSubscriberState(userId)

  // Sem assinatura reconhecida pela loja: se havia um registro ativo, expira.
  if (!snapshot) {
    const existing = await prisma.professionalSubscription.findUnique({
      where: { professionalId: professional.id },
      select: { id: true, status: true },
    })

    if (existing && existing.status !== "EXPIRED") {
      await prisma.professionalSubscription.update({
        where: { professionalId: professional.id },
        data: { status: "EXPIRED", gracePeriodEnd: null, autoRenew: false, lastVerifiedAt: new Date() },
      })
      await logEvent(existing.id, "EXPIRED", reason)
    }

    return { ok: true, entitlement: await getEntitlementByProfessionalId(professional.id) }
  }

  const subscription = await prisma.professionalSubscription.upsert({
    where: { professionalId: professional.id },
    create: {
      professionalId: professional.id,
      plan: snapshot.plan,
      status: snapshot.status,
      store: snapshot.store,
      storeProductId: snapshot.storeProductId,
      storeTransactionId: snapshot.storeTransactionId,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      gracePeriodEnd: snapshot.gracePeriodEnd,
      autoRenew: snapshot.autoRenew,
      lastVerifiedAt: new Date(),
    },
    update: {
      plan: snapshot.plan,
      status: snapshot.status,
      store: snapshot.store,
      storeProductId: snapshot.storeProductId,
      storeTransactionId: snapshot.storeTransactionId,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      gracePeriodEnd: snapshot.gracePeriodEnd,
      autoRenew: snapshot.autoRenew,
      lastVerifiedAt: new Date(),
    },
    select: { id: true, status: true, currentPeriodEnd: true, gracePeriodEnd: true, plan: true },
  })

  await logEvent(subscription.id, snapshot.status, reason)

  // Certificado so e emitido quando a assinatura esta efetivamente ativa agora.
  // Idempotente: reativacao/renovacao nao duplica.
  if (isSubscriptionActive(subscription)) {
    await emitCertificateIfNeeded(professional.id, professional.user.name)
  }

  return { ok: true, entitlement: await getEntitlementByProfessionalId(professional.id) }
}

// Reconcilia com a loja as assinaturas que estao perto de vencer, em tolerancia,
// ou canceladas mas ainda vigentes — os casos onde o estado muda sem o app avisar
// (renovacao, fim de tolerancia, expiracao). Cobre tambem "app fechado no meio do
// pagamento": mesmo sem o app reportar, aqui o servidor reconfirma. Idempotente.
// Roda por cron (Render) ou manualmente. Sem RevenueCat configurado, nao faz nada.
export async function reconcileSubscriptions(withinHours = 48): Promise<{ checked: number }> {
  const horizon = new Date(Date.now() + withinHours * 60 * 60 * 1000)

  const candidates = await prisma.professionalSubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "IN_GRACE", "CANCELED"] },
      OR: [{ currentPeriodEnd: { lte: horizon } }, { gracePeriodEnd: { not: null } }],
    },
    select: { professional: { select: { user: { select: { id: true } } } } },
  })

  let checked = 0

  for (const candidate of candidates) {
    try {
      await syncSubscriptionFromStore(candidate.professional.user.id, "reconcile")
      checked += 1
    } catch (error) {
      // Uma falha pontual (ex.: RevenueCat instavel) nao deve parar as demais.
      console.error("[subscriptions] falha ao reconciliar assinatura", error)
    }
  }

  return { checked }
}

// Registra uma transicao na trilha de auditoria. Nunca guarda recibo cru/sensivel:
// apenas o tipo e um resumo curto.
async function logEvent(subscriptionId: string, type: string, reason: string): Promise<void> {
  await prisma.subscriptionEvent
    .create({ data: { subscriptionId, type, summary: reason } })
    .catch((error) => {
      // Auditoria e complementar; nao deve derrubar a sincronizacao.
      console.error("[subscriptions] falha ao registrar evento", error)
    })
}
