// Smoke test do fluxo de propostas (rotas /api/app/proposals).
// Cria um cliente e um profissional descartáveis, valida o e-mail no banco e
// exercita: envio de proposta -> duplicidade bloqueada -> regras de área/região
// -> validações de conteúdo -> propostas recebidas pelo cliente -> permissões.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/proposals-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `pr_client_${suffix}@example.com`
const proEmail = `pr_pro_${suffix}@example.com`
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

  const setCookie = signIn.headers.get("set-cookie") ?? ""
  const cookie = setCookie
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")

  return (path: string, init: RequestInit = {}) =>
    req(path, ip, { ...init, headers: { cookie, ...init.headers } })
}

async function main() {
  const clientIp = `pr-client-${suffix}`
  const proIp = `pr-pro-${suffix}`

  const client = await signUpAndLogin(clientEmail, "CLIENT", clientIp)
  const pro = await signUpAndLogin(proEmail, "PROFESSIONAL", proIp)

  const json = (init: RequestInit) => ({ "content-type": "application/json", ...(init.headers ?? {}) })

  // Catálogo: uma cidade coberta e outra fora de cobertura.
  const categories = (await (await client("/api/app/categories")).json()) as {
    categories: { id: string }[]
  }
  const cities = (await (await client("/api/app/cities")).json()) as { cities: { id: string }[] }
  const categoryId = categories.categories[0]!.id
  const coveredCityId = cities.cities[0]!.id
  const otherCityId = cities.cities[1]!.id

  async function createRequest(cityId: string, title: string) {
    const res = await client("/api/app/service-requests", {
      method: "POST",
      headers: json({}),
      body: JSON.stringify({
        categoryId,
        cityId,
        title,
        description: "Descrição detalhada suficiente para passar na validação do servidor.",
        urgency: "THIS_WEEK",
      }),
    })
    return (await res.json()) as { request?: { id: string } }
  }

  const covered = await createRequest(coveredCityId, "Serviço na cidade coberta")
  const outOfRegion = await createRequest(otherCityId, "Serviço fora da região")
  const coveredId = covered.request!.id
  const outOfRegionId = outOfRegion.request!.id
  check("solicitações criadas", Boolean(coveredId) && Boolean(outOfRegionId))

  // Define cobertura do profissional: categoria + apenas a cidade coberta.
  const proUser = await prisma.user.findUnique({
    where: { email: proEmail },
    select: { professionalProfile: { select: { id: true } } },
  })
  const profileId = proUser?.professionalProfile?.id
  check("perfil profissional existe", Boolean(profileId))
  await prisma.professionalCategory.create({ data: { professionalId: profileId!, categoryId } })
  await prisma.professionalCity.create({ data: { professionalId: profileId!, cityId: coveredCityId } })

  function sendProposal(body: unknown, authed = pro) {
    return authed("/api/app/proposals", {
      method: "POST",
      headers: json({}),
      body: JSON.stringify(body),
    })
  }

  // 1. Envio válido.
  const sent = await sendProposal({
    serviceRequestId: coveredId,
    price: 500,
    message: "Posso realizar o serviço ainda esta semana. Tenho experiência neste tipo de instalação.",
    estimatedDays: 7,
  })
  const sentBody = (await sent.json()) as { proposal?: { id: string; price: number } }
  check("proposta enviada (201)", sent.status === 201 && sentBody.proposal?.price === 500, {
    status: sent.status,
    body: sentBody,
  })

  // 2. Duplicidade bloqueada.
  const duplicate = await sendProposal({
    serviceRequestId: coveredId,
    price: 600,
    message: "Tentando enviar novamente para a mesma solicitação, deve ser bloqueado.",
  })
  check("proposta duplicada bloqueada (409)", duplicate.status === 409, duplicate.status)

  // 3. Fora da região -> 403.
  const wrongRegion = await sendProposal({
    serviceRequestId: outOfRegionId,
    price: 300,
    message: "Proposta para solicitação fora das cidades atendidas pelo profissional.",
  })
  check("fora da região bloqueada (403)", wrongRegion.status === 403, wrongRegion.status)

  // 4. Mensagem curta -> 400.
  const shortMessage = await sendProposal({ serviceRequestId: coveredId, price: 100, message: "curta" })
  check("mensagem curta rejeitada (400)", shortMessage.status === 400, shortMessage.status)

  // 5. Valor inválido -> 400.
  const invalidPrice = await sendProposal({
    serviceRequestId: coveredId,
    price: 0,
    message: "Mensagem válida porém o valor é inválido e deve ser rejeitado pelo servidor.",
  })
  check("valor inválido rejeitado (400)", invalidPrice.status === 400, invalidPrice.status)

  // 6. Cliente vê a proposta recebida com nome e valor do profissional.
  const received = (await (await client("/api/app/proposals/received")).json()) as {
    proposals: { price: number; professional: { name: string }; serviceRequest: { id: string } }[]
  }
  check(
    "cliente vê a proposta recebida",
    received.proposals.length === 1 &&
      received.proposals[0]!.price === 500 &&
      Boolean(received.proposals[0]!.professional.name) &&
      received.proposals[0]!.serviceRequest.id === coveredId,
    received,
  )

  // 7. Detalhe da oportunidade reflete a proposta enviada e o contador.
  const detail = (await (await pro(`/api/app/opportunities/${coveredId}`)).json()) as {
    opportunity: { proposalsCount: number }
    myProposal: { price: number } | null
  }
  check(
    "detalhe reflete proposta enviada e contador",
    detail.myProposal?.price === 500 && detail.opportunity.proposalsCount === 1,
    detail,
  )

  // 8. Permissões: cliente não envia; profissional não lê recebidas.
  const clientCannotSend = await sendProposal(
    {
      serviceRequestId: coveredId,
      price: 200,
      message: "Cliente tentando enviar proposta deve ser bloqueado pelo servidor.",
    },
    client,
  )
  check("cliente não envia proposta (403)", clientCannotSend.status === 403, clientCannotSend.status)

  const proCannotList = await pro("/api/app/proposals/received")
  check("profissional não lê recebidas (403)", proCannotList.status === 403, proCannotList.status)

  // 9. Notificação registrada para o cliente.
  const notifications = await prisma.notification.count({
    where: { user: { email: clientEmail }, type: "PROPOSAL_RECEIVED" },
  })
  check("notificação de proposta criada", notifications === 1, notifications)

  // Limpeza.
  await prisma.user.delete({ where: { email: clientEmail } }).catch(() => {})
  await prisma.user.delete({ where: { email: proEmail } }).catch(() => {})

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  await prisma.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
