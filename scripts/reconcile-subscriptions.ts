// Reconciliação periódica das assinaturas com a loja (via RevenueCat). Pensado para
// rodar como Cron Job no Render, cobrindo o que muda fora do app (renovação, fim de
// tolerância, expiração) e o caso de "app fechado no meio do pagamento". Idempotente.
//
//   npx tsx --tsconfig apps/api/tsconfig.json scripts/reconcile-subscriptions.ts

import { prisma } from "@santiago/database"

import { revenueCatConfig } from "../apps/api/src/config/env"
import { reconcileSubscriptions } from "../apps/api/src/modules/subscriptions/service"

async function main() {
  if (!revenueCatConfig) {
    console.log("[reconcile] RevenueCat não configurado; nada a fazer.")
    return
  }

  const { checked } = await reconcileSubscriptions()
  console.log(`[reconcile] assinaturas reconciliadas: ${checked}`)
}

main()
  .catch((error) => {
    console.error("[reconcile] falha na reconciliação", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
