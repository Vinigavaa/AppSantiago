// Smoke test do gerenciamento de solicitações pelo cliente + perfil público do
// profissional (rotas /api/app). Cobre: detalhe (endereço completo só do dono),
// edição, exclusão (permitida sem contrato / bloqueada com contrato) e o perfil
// público consumido a partir da proposta recebida.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/request-management-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `rm_client_${suffix}@example.com`
const otherEmail = `rm_other_${suffix}@example.com`
const proEmail = `rm_pro_${suffix}@example.com`
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

async function main() {
  const client = await signUpAndLogin(clientEmail, "CLIENT", `rm-client-${suffix}`)
  const other = await signUpAndLogin(otherEmail, "CLIENT", `rm-other-${suffix}`)
  const pro = await signUpAndLogin(proEmail, "PROFESSIONAL", `rm-pro-${suffix}`)

  const categories = (await (await client("/api/app/categories")).json()) as {
    categories: { id: string }[]
  }
  const cities = (await (await client("/api/app/cities")).json()) as { cities: { id: string }[] }
  const categoryId = categories.categories[0]!.id
  const cityId = cities.cities[0]!.id

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
        complement: "Apto 4",
        urgency: "THIS_WEEK",
      }),
    })
    return (await res.json()) as { request?: { id: string } }
  }

  // --- Detalhe (dono vê endereço completo) ---
  const created = await createRequest("Instalar tomadas na cozinha")
  const requestId = created.request!.id
  check("solicitação criada", Boolean(requestId))

  const detailRes = await client(`/api/app/service-requests/${requestId}`)
  const detail = (await detailRes.json()) as {
    request?: { address?: { street: string | null; zipCode: string | null }; updatedAt?: string }
  }
  check("detalhe 200", detailRes.status === 200, detailRes.status)
  check(
    "detalhe expõe endereço completo ao dono",
    detail.request?.address?.street === "Rua das Flores" &&
      detail.request?.address?.zipCode === "88801-000",
    detail.request?.address,
  )

  // Outro cliente não acessa o detalhe (404).
  const foreignDetail = await other(`/api/app/service-requests/${requestId}`)
  check("detalhe de terceiro bloqueado (404)", foreignDetail.status === 404, foreignDetail.status)

  // --- Edição ---
  const editRes = await client(`/api/app/service-requests/${requestId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      categoryId,
      cityId,
      title: "Instalar tomadas e interruptores",
      description: "Descrição atualizada com detalhes suficientes para a validação do servidor.",
      zipCode: "88802-100",
      street: "Rua Nova",
      number: "456",
      neighborhood: "Comerciário",
      urgency: "URGENT",
    }),
  })
  const edited = (await editRes.json()) as {
    request?: { title?: string; address?: { street: string | null }; createdAt?: string; updatedAt?: string }
  }
  check("edição 200", editRes.status === 200, editRes.status)
  check("título atualizado", edited.request?.title === "Instalar tomadas e interruptores")
  check("endereço atualizado", edited.request?.address?.street === "Rua Nova", edited.request?.address)
  check(
    "updatedAt > createdAt após edição",
    Boolean(edited.request?.updatedAt && edited.request?.createdAt) &&
      new Date(edited.request!.updatedAt!).getTime() >
        new Date(edited.request!.createdAt!).getTime(),
  )

  // Profissional não pode editar a solicitação de um cliente (403).
  const proEdit = await pro(`/api/app/service-requests/${requestId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      categoryId,
      cityId,
      title: "Tentativa indevida",
      description: "Descrição qualquer com tamanho suficiente para validação do servidor.",
      zipCode: "88801-000",
      street: "Rua X",
      number: "1",
      neighborhood: "Centro",
      urgency: "FLEXIBLE",
    }),
  })
  check("profissional não edita solicitação (403)", proEdit.status === 403, proEdit.status)

  // --- Exclusão sem contrato (permitida) ---
  const deletable = await createRequest("Solicitação descartável")
  const deletableId = deletable.request!.id
  const delRes = await client(`/api/app/service-requests/${deletableId}`, { method: "DELETE" })
  check("exclusão sem contrato 200", delRes.status === 200, delRes.status)
  const afterDelete = await client(`/api/app/service-requests/${deletableId}`)
  check("solicitação some após exclusão (404)", afterDelete.status === 404, afterDelete.status)

  // --- Fluxo com contrato: bloqueia exclusão + perfil público ---
  const proUser = await prisma.user.findUnique({
    where: { email: proEmail },
    select: { professionalProfile: { select: { id: true } } },
  })
  const proProfileId = proUser!.professionalProfile!.id
  await prisma.professionalCategory.create({ data: { professionalId: proProfileId, categoryId } })
  await prisma.professionalCity.create({ data: { professionalId: proProfileId, cityId } })

  const proposalRes = await pro("/api/app/proposals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      serviceRequestId: requestId,
      price: 350,
      message: "Posso realizar o serviço com qualidade e dentro do prazo combinado.",
      estimatedDays: 2,
    }),
  })
  check("proposta enviada 201", proposalRes.status === 201, proposalRes.status)

  // Proposta recebida expõe o id do profissional (para abrir o perfil público).
  const received = (await (await client("/api/app/proposals/received")).json()) as {
    proposals: { id: string; professional: { id?: string } }[]
  }
  const receivedProposal = received.proposals[0]
  check(
    "proposta recebida expõe professional.id",
    receivedProposal?.professional.id === proProfileId,
    receivedProposal?.professional,
  )

  // Perfil público do profissional (visível a qualquer autenticado).
  const publicRes = await client(`/api/app/professionals/${proProfileId}`)
  const publicBody = (await publicRes.json()) as {
    professional?: { id: string; categories: unknown[]; stats?: { servicesCompleted: number } }
  }
  check("perfil público 200", publicRes.status === 200, publicRes.status)
  check(
    "perfil público traz atuação e estatísticas",
    publicBody.professional?.id === proProfileId &&
      publicBody.professional.categories.length >= 1 &&
      publicBody.professional.stats?.servicesCompleted === 0,
    publicBody.professional,
  )

  // Aceita a proposta -> cria contrato -> exclusão passa a ser bloqueada.
  const accept = await client(`/api/app/proposals/${receivedProposal!.id}/accept`, { method: "POST" })
  check("aceite da proposta 200", accept.status === 200, accept.status)

  const blockedDelete = await client(`/api/app/service-requests/${requestId}`, { method: "DELETE" })
  check("exclusão bloqueada com contrato (409)", blockedDelete.status === 409, blockedDelete.status)

  // --- Profissional cancela o serviço já contratado -> solicitação reabre ---
  const contractRow = await prisma.serviceContract.findFirst({
    where: { serviceRequestId: requestId },
    select: { id: true },
  })
  const proCancel = await pro(`/api/app/contracts/${contractRow!.id}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "Imprevisto de agenda" }),
  })
  check("profissional cancela o contrato 200", proCancel.status === 200, proCancel.status)

  const reopened = (await (await client(`/api/app/service-requests/${requestId}`)).json()) as {
    request?: { status?: string; contract?: unknown }
  }
  check("solicitação volta para OPEN", reopened.request?.status === "OPEN", reopened.request?.status)
  check("solicitação reaberta sem contrato ativo", reopened.request?.contract === null)

  const canceledProposal = await prisma.proposal.findFirst({
    where: { serviceRequestId: requestId, professionalId: proProfileId },
    select: { status: true },
  })
  check("proposta do profissional cancelada", canceledProposal?.status === "CANCELED", canceledProposal)

  const oppAfter = (await (await pro("/api/app/opportunities")).json()) as {
    opportunities: { id: string }[]
  }
  check(
    "oportunidade some das telas do profissional",
    oppAfter.opportunities.every((item) => item.id !== requestId),
  )

  // Reaberta e sem contrato -> pode ser excluída.
  const delReopened = await client(`/api/app/service-requests/${requestId}`, { method: "DELETE" })
  check("exclusão da solicitação reaberta 200", delReopened.status === 200, delReopened.status)

  // --- Cliente cancela -> solicitação CANCELADA pode ser excluída ---
  const toCancel = await createRequest("Serviço cancelado pelo cliente")
  const toCancelId = toCancel.request!.id
  await pro("/api/app/proposals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      serviceRequestId: toCancelId,
      price: 200,
      message: "Proposta para o serviço que será cancelado pelo cliente mais adiante.",
      estimatedDays: 1,
    }),
  })
  const toCancelReceived = (await (await client("/api/app/proposals/received")).json()) as {
    proposals: { id: string; serviceRequest: { id: string } }[]
  }
  const toCancelProposal = toCancelReceived.proposals.find(
    (proposal) => proposal.serviceRequest.id === toCancelId,
  )!
  await client(`/api/app/proposals/${toCancelProposal.id}/accept`, { method: "POST" })

  const toCancelContract = await prisma.serviceContract.findFirst({
    where: { serviceRequestId: toCancelId },
    select: { id: true },
  })
  const clientCancel = await client(`/api/app/contracts/${toCancelContract!.id}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "Não preciso mais" }),
  })
  check("cliente cancela o contrato 200", clientCancel.status === 200, clientCancel.status)

  const clientCanceledProposal = await prisma.proposal.findUnique({
    where: { id: toCancelProposal.id },
    select: { status: true },
  })
  check(
    "proposta vira CANCELED ao cancelar serviço",
    clientCanceledProposal?.status === "CANCELED",
    clientCanceledProposal,
  )

  const canceledDetail = (await (
    await client(`/api/app/service-requests/${toCancelId}`)
  ).json()) as { request?: { status?: string } }
  check("solicitação fica CANCELADA", canceledDetail.request?.status === "CANCELED")

  const delCanceled = await client(`/api/app/service-requests/${toCancelId}`, { method: "DELETE" })
  check("exclusão de solicitação cancelada 200", delCanceled.status === 200, delCanceled.status)
  const afterCanceledDelete = await client(`/api/app/service-requests/${toCancelId}`)
  check("solicitação cancelada some após exclusão (404)", afterCanceledDelete.status === 404)

  // Limpeza: remove contratos/solicitações remanescentes antes dos usuários.
  await prisma.serviceContract
    .deleteMany({ where: { serviceRequestId: { in: [requestId, toCancelId] } } })
    .catch(() => {})
  await prisma.serviceRequest
    .deleteMany({ where: { id: { in: [requestId, toCancelId] } } })
    .catch(() => {})
  await prisma.user.delete({ where: { email: clientEmail } }).catch(() => {})
  await prisma.user.delete({ where: { email: otherEmail } }).catch(() => {})
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
