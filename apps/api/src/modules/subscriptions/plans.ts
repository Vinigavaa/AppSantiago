import { env } from "@/config/env"

// Mapeia o product id vindo da loja/RevenueCat para o plano do nosso modelo. Os
// ids reais sao cadastrados no Grupo 1 e informados por env — aqui so traduzimos.
// Sem os ids configurados, retornamos null e o registro da assinatura e recusado
// (nao adivinhamos plano).

export type Plan = "MONTHLY" | "ANNUAL"

export const ENTITLEMENT_ID = env.REVENUECAT_ENTITLEMENT_ID

// Cada env pode listar VÁRIOS identificadores separados por vírgula (Android, iOS,
// Test Store, ou o REST API id do RevenueCat) — todos apontando para o mesmo plano.
// Assim o match funciona independentemente de qual identificador a loja devolve.
function idList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

export function planForProductId(productId: string): Plan | null {
  if (idList(env.REVENUECAT_PRODUCT_MONTHLY).includes(productId)) {
    return "MONTHLY"
  }

  if (idList(env.REVENUECAT_PRODUCT_ANNUAL).includes(productId)) {
    return "ANNUAL"
  }

  return null
}
