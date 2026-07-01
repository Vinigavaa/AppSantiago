// Smoke test das funcionalidades: avaliação do cliente pelo profissional e
// cancelamento por não comparecimento (reabre a solicitação e permite
// recontratação, preservando o histórico do contrato cancelado).
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/reviews-noshow-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `rn_client_${suffix}@example.com`
const pro1Email = `rn_pro1_${suffix}@example.com`
const pro2Email = `rn_pro2_${suffix}@example.com`
const password = "Password123!"

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

function req(path: string, ip: string, init: RequestInit = {}) {
  return app.request(`${baseUrl}${path}`, {
    ...init,
    headers: { origin, "x-forwarded-for": ip, ...init.headers },
  })
}

async function signUpAndLogin(email: string, role: "CLIENT" | "PROFESSIONAL", ip: string) {
  const username = email.split("@")[0]!

  await req("/api/auth/sign-up/email", ip, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: username, username, displayUsername: username, email, password, role }),
  })

  await prisma.user.update({ where: { email }, data: { emailVerified: true } })

  const signIn = await req("/api/auth/sign-in/email", ip, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const cookie = (signIn.headers.get("set-cookie") ?? "")
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")

  return (path: string, init: RequestInit = {}) =>
    req(path, ip, { ...init, headers: { cookie, ...init.headers } })
}

async function grantCoverage(email: string, categoryId: string, cityId: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, professionalProfile: { select: { id: true } } },
  })
  const profileId = user!.professionalProfile!.id
  await prisma.professionalCategory.create({ data: { professionalId: profileId, categoryId } })
  await prisma.professionalCity.create({ data: { professionalId: profileId, cityId } })
  return { userId: user!.id, profileId }
}

async function main() {
  const client = await signUpAndLogin(clientEmail, "CLIENT", `rn-client-${suffix}`)
  const pro1 = await signUpAndLogin(pro1Email, "PROFESSIONAL", `rn-pro1-${suffix}`)
  const pro2 = await signUpAndLogin(pro2Email, "PROFESSIONAL", `rn-pro2-${suffix}`)

  const categories = (await (await client("/api/app/categories")).json()) as {
    categories: { id: string }[]
  }
  const cities = (await (await client("/api/app/cities")).json()) as { cities: { id: string }[] }
  const categoryId = categories.categories[0]!.id
  const cityId = cities.cities[0]!.id

  const pro1Ctx = await grantCoverage(pro1Email, categoryId, cityId)
  await grantCoverage(pro2Email, categoryId, cityId)

  const clientUser = await prisma.user.findUnique({
    where: { email: clientEmail },
    select: { id: true, clientProfile: { select: { id: true } } },
  })
  const clientUserId = clientUser!.id

  async function createRequest(title: string) {
    const res = await client("/api/app/service-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId,
        cityId,
        title,
        description: "Descrição detalhada suficiente para passar na validação do servidor.",
        zipCode: "88801-000",
        street: "Rua das Flores",
        number: "123",
        neighborhood: "Centro",
        urgency: "THIS_WEEK",
      }),
    })
    return ((await res.json()) as { request: { id: string } }).request.id
  }

  async function sendProposal(
    pro: (path: string, init?: RequestInit) => Promise<Response>,
    requestId: string,
  ) {
    const res = await pro("/api/app/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceRequestId: requestId,
        price: 300,
        message: "Proposta com detalhes suficientes para a validação do servidor da plataforma.",
        estimatedDays: 2,
      }),
    })
    return res.status
  }

  async function acceptLatestProposal(requestId: string) {
    const received = (await (await client("/api/app/proposals/received")).json()) as {
      proposals: { id: string; status: string; serviceRequest: { id: string } }[]
    }
    const proposal = received.proposals.find(
      (p) => p.serviceRequest.id === requestId && p.status === "PENDING",
    )!
    const res = await client(`/api/app/proposals/${proposal.id}/accept`, { method: "POST" })
    return res.status
  }

  async function contractOf(requestId: string) {
    return prisma.serviceContract.findFirst({
      where: { serviceRequestId: requestId, status: { not: "CANCELED" } },
      select: { id: true },
    })
  }

  // ===== Cenário A: não comparecimento -> reabre -> recontrata =====
  const r1 = await createRequest("Trocar resistência do chuveiro")
  check("proposta pro1 enviada", (await sendProposal(pro1, r1)) === 201)
  check("cliente aceita pro1", (await acceptLatestProposal(r1)) === 200)

  const c1 = await contractOf(r1)
  const noShow = await client(`/api/app/contracts/${c1!.id}/no-show`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "Não apareceu no horário" }),
  })
  check("não comparecimento 200", noShow.status === 200, noShow.status)

  const r1Detail = (await (await client(`/api/app/service-requests/${r1}`)).json()) as {
    request: { status: string; contract: unknown }
  }
  check("solicitação reaberta (OPEN)", r1Detail.request.status === "OPEN", r1Detail.request.status)
  check("sem contrato ativo após reabrir", r1Detail.request.contract === null)

  const c1Row = await prisma.serviceContract.findUnique({
    where: { id: c1!.id },
    select: { status: true, canceledBy: true, cancelReason: true, canceledAt: true },
  })
  check(
    "contrato cancelado preserva auditoria",
    c1Row?.status === "CANCELED" &&
      c1Row.canceledBy === clientUserId &&
      c1Row.cancelReason === "Não apareceu no horário" &&
      c1Row.canceledAt !== null,
    c1Row,
  )

  const pro1Proposal = await prisma.proposal.findFirst({
    where: { serviceRequestId: r1, professionalId: pro1Ctx.profileId },
    select: { status: true },
  })
  check("proposta do faltante cancelada", pro1Proposal?.status === "CANCELED", pro1Proposal)

  const pro1Opps = (await (await pro1("/api/app/opportunities")).json()) as {
    opportunities: { id: string }[]
  }
  check(
    "faltante não vê mais a solicitação",
    pro1Opps.opportunities.every((o) => o.id !== r1),
  )

  const pro2Opps = (await (await pro2("/api/app/opportunities")).json()) as {
    opportunities: { id: string }[]
  }
  check("outro profissional vê a solicitação reaberta", pro2Opps.opportunities.some((o) => o.id === r1))

  // Recontratação: prova que a solicitação admite um novo contrato (1-para-N).
  check("proposta pro2 enviada", (await sendProposal(pro2, r1)) === 201)
  check("cliente aceita pro2 (recontratação)", (await acceptLatestProposal(r1)) === 200)

  const contractsForR1 = await prisma.serviceContract.count({ where: { serviceRequestId: r1 } })
  check("solicitação passa a ter 2 contratos no histórico", contractsForR1 === 2, contractsForR1)

  // ===== Cenário B: profissional avalia o cliente =====
  const c2 = await contractOf(r1)
  check("iniciar serviço (pro2)", (await pro2(`/api/app/professional/services/${c2!.id}/start`, { method: "POST" })).status === 200)
  check("concluir serviço (pro2)", (await pro2(`/api/app/professional/services/${c2!.id}/complete`, { method: "POST" })).status === 200)

  const proReview = await pro2("/api/app/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceContractId: c2!.id, rating: 5, comment: "Cliente educado e organizado." }),
  })
  check("profissional avalia cliente 201", proReview.status === 201, proReview.status)

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: clientUserId },
    select: { ratingAverage: true, ratingCount: true },
  })
  check(
    "reputação do cliente atualizada",
    Number(clientProfile?.ratingAverage) === 5 && clientProfile?.ratingCount === 1,
    clientProfile,
  )

  const dupReview = await pro2("/api/app/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceContractId: c2!.id, rating: 4 }),
  })
  check("avaliação duplicada bloqueada (409)", dupReview.status === 409, dupReview.status)

  // Cliente avalia o profissional (sentido oposto, permitido no mesmo contrato).
  const clientReview = await client("/api/app/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceContractId: c2!.id, rating: 5 }),
  })
  check("cliente avalia profissional 201", clientReview.status === 201, clientReview.status)

  // Avaliação de contrato não concluído (o C1 está cancelado) é bloqueada.
  const canceledReview = await pro1("/api/app/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceContractId: c1!.id, rating: 3 }),
  })
  check("avaliação de serviço cancelado bloqueada (409)", canceledReview.status === 409, canceledReview.status)

  // ===== Cenário C: reputação do cliente visível na oportunidade =====
  const r2 = await createRequest("Instalar ventilador de teto")
  const oppDetail = (await (await pro1(`/api/app/opportunities/${r2}`)).json()) as {
    client: { ratingAverage: number; ratingCount: number; reviews: unknown[] } | null
  }
  check(
    "reputação do cliente exposta na oportunidade",
    oppDetail.client?.ratingAverage === 5 &&
      oppDetail.client.ratingCount === 1 &&
      oppDetail.client.reviews.length === 1,
    oppDetail.client,
  )

  // Limpeza: contratos -> solicitações -> usuários.
  await prisma.serviceContract
    .deleteMany({ where: { serviceRequestId: { in: [r1, r2] } } })
    .catch(() => {})
  await prisma.serviceRequest.deleteMany({ where: { id: { in: [r1, r2] } } }).catch(() => {})
  await prisma.user.delete({ where: { email: clientEmail } }).catch(() => {})
  await prisma.user.delete({ where: { email: pro1Email } }).catch(() => {})
  await prisma.user.delete({ where: { email: pro2Email } }).catch(() => {})

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  await prisma.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
