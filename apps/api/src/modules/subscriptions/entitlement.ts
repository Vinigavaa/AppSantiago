import { type Prisma, prisma } from "@santiago/database"

// Fonte única da regra "tem assinatura ativa". Todo módulo que concede vantagens
// (propostas, busca, perfil, certificado) consulta este serviço — a decisão nunca
// vem do dispositivo. O estado e as datas são os que o servidor confirmou com a
// loja (via RevenueCat); aqui só derivamos o "ativo agora" a partir deles.

export type SubscriptionPlan = "MONTHLY" | "ANNUAL"

export type Entitlement = {
  isActive: boolean
  plan: SubscriptionPlan | null
  // Fim do período pago atual, quando há assinatura; null quando não há.
  currentPeriodEnd: Date | null
  // Estado bruto, útil para a UI (ex.: mostrar "em tolerância" ou "cancelada").
  status: "ACTIVE" | "IN_GRACE" | "CANCELED" | "EXPIRED" | "NONE"
}

const INACTIVE: Entitlement = {
  isActive: false,
  plan: null,
  currentPeriodEnd: null,
  status: "NONE",
}

// Campos mínimos necessários para decidir a vigência. Manter enxuto evita puxar
// dados desnecessários nas checagens de gate, que rodam em caminhos quentes.
type ActivityFields = {
  status: "ACTIVE" | "IN_GRACE" | "CANCELED" | "EXPIRED"
  currentPeriodEnd: Date
  gracePeriodEnd: Date | null
}

// Regra pura de vigência (sem I/O), para ser testável isoladamente:
// - ACTIVE/CANCELED valem enquanto o período pago não venceu (cancelar só desliga
//   a renovação; as vantagens seguem até currentPeriodEnd).
// - IN_GRACE vale enquanto a tolerância não venceu.
// - EXPIRED nunca vale.
// A checagem por data é defensiva: mesmo que a reconciliação ainda não tenha
// virado o estado, um período vencido não concede vantagem.
export function isSubscriptionActive(sub: ActivityFields, now: Date = new Date()): boolean {
  switch (sub.status) {
    case "ACTIVE":
    case "CANCELED":
      return sub.currentPeriodEnd.getTime() > now.getTime()
    case "IN_GRACE":
      return sub.gracePeriodEnd !== null && sub.gracePeriodEnd.getTime() > now.getTime()
    case "EXPIRED":
      return false
  }
}

function toEntitlement(
  sub:
    | (ActivityFields & { plan: SubscriptionPlan })
    | null,
  now: Date = new Date(),
): Entitlement {
  if (!sub) {
    return INACTIVE
  }

  return {
    isActive: isSubscriptionActive(sub, now),
    plan: sub.plan,
    currentPeriodEnd: sub.currentPeriodEnd,
    status: sub.status,
  }
}

const activitySelect = {
  status: true,
  plan: true,
  currentPeriodEnd: true,
  gracePeriodEnd: true,
} satisfies Prisma.ProfessionalSubscriptionSelect

// Entitlement de um profissional pelo id do perfil profissional.
export async function getEntitlementByProfessionalId(
  professionalId: string,
): Promise<Entitlement> {
  const sub = await prisma.professionalSubscription.findUnique({
    where: { professionalId },
    select: activitySelect,
  })

  return toEntitlement(sub)
}

// Entitlement pelo userId (o perfil profissional é 1:1 com o usuário). Usado nos
// caminhos onde só temos o usuário autenticado.
export async function getEntitlementByUserId(userId: string): Promise<Entitlement> {
  const sub = await prisma.professionalSubscription.findFirst({
    where: { professional: { userId } },
    select: activitySelect,
  })

  return toEntitlement(sub)
}

// Versão em lote para a busca: dado um conjunto de ids de perfil, devolve o
// subconjunto que está com assinatura ativa agora. Uma única query.
export async function getActiveSubscriberProfileIds(
  professionalIds: string[],
): Promise<Set<string>> {
  if (professionalIds.length === 0) {
    return new Set()
  }

  const now = new Date()

  const subs = await prisma.professionalSubscription.findMany({
    where: {
      professionalId: { in: professionalIds },
      status: { in: ["ACTIVE", "IN_GRACE", "CANCELED"] },
    },
    select: { professionalId: true, ...activitySelect },
  })

  const active = new Set<string>()

  for (const sub of subs) {
    if (isSubscriptionActive(sub, now)) {
      active.add(sub.professionalId)
    }
  }

  return active
}
