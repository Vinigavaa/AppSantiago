// Smoke test das assinaturas (lado servidor, sem RevenueCat). Cria um profissional
// descartável, manipula a linha de assinatura direto no banco para simular estados
// e valida: regra de vigência, entitlement, ordenação de destaque, emissão/validade
// do certificado e o limite mensal de propostas.
//
//   npx tsx --tsconfig apps/api/tsconfig.json scripts/subscriptions-smoke.ts

import { prisma } from "@santiago/database"

import {
  getActiveSubscriberProfileIds,
  getEntitlementByProfessionalId,
  isSubscriptionActive,
} from "../apps/api/src/modules/subscriptions/entitlement"
import {
  emitCertificateIfNeeded,
  verifyCertificate,
} from "../apps/api/src/modules/certificates/service"

const suffix = Date.now().toString()
let failures = 0

function check(label: string, condition: boolean, detail?: unknown) {
  console.log(`[${condition ? "PASS" : "FAIL"}] ${label}`)
  if (!condition) {
    failures += 1
    if (detail !== undefined) {
      console.log("       detail:", JSON.stringify(detail))
    }
  }
}

const DAY = 24 * 60 * 60 * 1000

async function main() {
  // --- Regra pura de vigência (sem I/O) ---
  const future = new Date(Date.now() + 10 * DAY)
  const past = new Date(Date.now() - 10 * DAY)

  check(
    "ACTIVE com período futuro é ativo",
    isSubscriptionActive({ status: "ACTIVE", currentPeriodEnd: future, gracePeriodEnd: null }),
  )
  check(
    "ACTIVE com período vencido não é ativo",
    !isSubscriptionActive({ status: "ACTIVE", currentPeriodEnd: past, gracePeriodEnd: null }),
  )
  check(
    "CANCELED mantém vantagens até o fim do período",
    isSubscriptionActive({ status: "CANCELED", currentPeriodEnd: future, gracePeriodEnd: null }),
  )
  check(
    "IN_GRACE vale enquanto a tolerância não vence",
    isSubscriptionActive({ status: "IN_GRACE", currentPeriodEnd: past, gracePeriodEnd: future }),
  )
  check(
    "EXPIRED nunca é ativo",
    !isSubscriptionActive({ status: "EXPIRED", currentPeriodEnd: future, gracePeriodEnd: future }),
  )

  // --- Profissional descartável para os testes com banco ---
  const user = await prisma.user.create({
    data: {
      name: "Smoke Pro",
      email: `subs_pro_${suffix}@example.com`,
      role: "PROFESSIONAL",
      professionalProfile: { create: {} },
    },
    select: { id: true, name: true, professionalProfile: { select: { id: true } } },
  })

  const professionalId = user.professionalProfile!.id

  try {
    // Sem assinatura: entitlement inativo.
    const none = await getEntitlementByProfessionalId(professionalId)
    check("sem assinatura → inativo", !none.isActive, none)

    // Assinatura ativa.
    await prisma.professionalSubscription.create({
      data: {
        professionalId,
        plan: "MONTHLY",
        status: "ACTIVE",
        store: "GOOGLE_PLAY",
        storeProductId: `p_${suffix}`,
        storeTransactionId: `t_${suffix}`,
        currentPeriodEnd: future,
      },
    })

    const active = await getEntitlementByProfessionalId(professionalId)
    check("assinatura ativa → isActive", active.isActive && active.plan === "MONTHLY", active)

    const featured = await getActiveSubscriberProfileIds([professionalId])
    check("lote de assinantes inclui o ativo", featured.has(professionalId))

    // Certificado: emitido, idempotente, válido enquanto ativo.
    await emitCertificateIfNeeded(professionalId, user.name)
    await emitCertificateIfNeeded(professionalId, user.name)
    const certCount = await prisma.participationCertificate.count({ where: { professionalId } })
    check("certificado idempotente (1 registro)", certCount === 1, { certCount })

    const cert = await prisma.participationCertificate.findUnique({
      where: { professionalId },
      select: { code: true },
    })
    const verifiedActive = await verifyCertificate(cert!.code)
    check(
      "certificado válido enquanto ativo",
      verifiedActive.found && verifiedActive.valid,
      verifiedActive,
    )

    // Expira: entitlement inativo, certificado inválido, sai do lote de destaque.
    await prisma.professionalSubscription.update({
      where: { professionalId },
      data: { status: "EXPIRED" },
    })

    const expired = await getEntitlementByProfessionalId(professionalId)
    check("assinatura expirada → inativo", !expired.isActive, expired)

    const verifiedExpired = await verifyCertificate(cert!.code)
    check(
      "certificado inválido quando expirada",
      verifiedExpired.found && !verifiedExpired.valid,
      verifiedExpired,
    )

    const featuredAfter = await getActiveSubscriberProfileIds([professionalId])
    check("expirada sai do lote de destaque", !featuredAfter.has(professionalId))

    // Reativa: certificado volta a valer (mesmo código).
    await prisma.professionalSubscription.update({
      where: { professionalId },
      data: { status: "ACTIVE", currentPeriodEnd: future },
    })
    const verifiedRevalidated = await verifyCertificate(cert!.code)
    check("reativação revalida o mesmo código", verifiedRevalidated.found && verifiedRevalidated.valid)

    // Código inexistente → não encontrado.
    const missing = await verifyCertificate("MAO-000000000000")
    check("código inexistente → not found", !missing.found)
  } finally {
    // Limpeza: cascata remove assinatura/eventos/certificado junto com o usuário.
    await prisma.user.delete({ where: { id: user.id } })
  }

  console.log(failures === 0 ? "\nTodos os checks passaram." : `\n${failures} check(s) falharam.`)
  process.exitCode = failures === 0 ? 0 : 1
}

main()
  .catch((error) => {
    console.error("[subscriptions-smoke] erro", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
