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
  const proposalId = sentBody.proposal!.id

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
  const detailRaw = await (await pro(`/api/app/opportunities/${coveredId}`)).text()
  const detail = JSON.parse(detailRaw) as {
    opportunity: { proposalsCount: number; neighborhood: string | null }
    myProposal: { price: number } | null
  }
  check(
    "detalhe reflete proposta enviada e contador",
    detail.myProposal?.price === 500 && detail.opportunity.proposalsCount === 1,
    detail,
  )

  // 7b. Privacidade: antes da contratação o detalhe não vaza rua/número/CEP.
  check(
    "endereço completo protegido antes da contratação",
    !detailRaw.includes("Rua das Flores") &&
      !detailRaw.includes("88801-000") &&
      detail.opportunity.neighborhood === "Centro",
    detailRaw,
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

  // --- Gerenciamento: aceitar / recusar ---

  function accept(id: string, authed = client) {
    return authed(`/api/app/proposals/${id}/accept`, { method: "POST" })
  }
  function reject(id: string, authed = client) {
    return authed(`/api/app/proposals/${id}/reject`, { method: "POST" })
  }

  // 10. Profissional não pode aceitar (somente o cliente dono).
  const proCannotAccept = await accept(proposalId, pro)
  check("profissional não aceita (403)", proCannotAccept.status === 403, proCannotAccept.status)

  // 11. Cliente aceita a proposta -> ACCEPTED.
  const accepted = await accept(proposalId)
  const acceptedBody = (await accepted.json()) as { proposal?: { status: string } }
  check(
    "proposta aceita (ACCEPTED)",
    accepted.status === 200 && acceptedBody.proposal?.status === "ACCEPTED",
    { status: accepted.status, body: acceptedBody },
  )

  // 12. Reaceitar/recusar a mesma proposta -> 409.
  const reAccept = await accept(proposalId)
  check("reaceitar bloqueado (409)", reAccept.status === 409, reAccept.status)
  const rejectAfterAccept = await reject(proposalId)
  check("recusar após aceitar bloqueado (409)", rejectAfterAccept.status === 409, rejectAfterAccept.status)

  // 13. Solicitação marcada como contratada (ACCEPTED) e fora das oportunidades.
  const requestRow = await prisma.serviceRequest.findUnique({
    where: { id: coveredId },
    select: { status: true },
  })
  check("solicitação contratada (ACCEPTED)", requestRow?.status === "ACCEPTED", requestRow)

  const feed = (await (await pro("/api/app/opportunities")).json()) as {
    opportunities: { id: string }[]
  }
  check(
    "solicitação contratada sai das oportunidades",
    feed.opportunities.every((item) => item.id !== coveredId),
    feed,
  )

  // 14. "Meus Serviços": contrato visível com endereço/contato liberados.
  const services = (await (await pro("/api/app/professional/services")).json()) as {
    services: {
      status: string
      price: number
      serviceRequest: {
        id: string
        address: { street: string | null; number: string | null; zipCode: string | null }
        city: { name: string }
      }
      client: { name: string }
    }[]
  }
  const service = services.services.find((item) => item.serviceRequest.id === coveredId)
  check(
    "serviço aparece em Meus Serviços com dados liberados",
    Boolean(service) &&
      service!.status === "ACCEPTED" &&
      service!.price === 500 &&
      Boolean(service!.client.name) &&
      Boolean(service!.serviceRequest.city.name),
    services,
  )
  check(
    "endereço completo liberado ao profissional contratado",
    service?.serviceRequest.address.street === "Rua das Flores" &&
      service?.serviceRequest.address.number === "123" &&
      service?.serviceRequest.address.zipCode === "88801-000",
    service?.serviceRequest.address,
  )

  // 15. Notificação de aceite para o profissional.
  const acceptNotif = await prisma.notification.count({
    where: { user: { email: proEmail }, type: "PROPOSAL_ACCEPTED" },
  })
  check("notificação de aceite criada", acceptNotif === 1, acceptNotif)

  // --- Ciclo de vida do serviço: iniciar -> concluir ---
  const contractId = service!.id

  const started = await pro(`/api/app/professional/services/${contractId}/start`, {
    method: "POST",
  })
  const startedBody = (await started.json()) as { service?: { status: string } }
  check(
    "serviço iniciado (IN_PROGRESS)",
    started.status === 200 && startedBody.service?.status === "IN_PROGRESS",
    { status: started.status, body: startedBody },
  )

  const reqAfterStart = await prisma.serviceRequest.findUnique({
    where: { id: coveredId },
    select: { status: true },
  })
  check("solicitação em andamento (IN_PROGRESS)", reqAfterStart?.status === "IN_PROGRESS", reqAfterStart)

  const restart = await pro(`/api/app/professional/services/${contractId}/start`, { method: "POST" })
  check("reiniciar serviço bloqueado (409)", restart.status === 409, restart.status)

  function review(body: unknown, authed = client) {
    return authed("/api/app/reviews", { method: "POST", headers: json({}), body: JSON.stringify(body) })
  }

  const earlyReview = await review({ serviceContractId: contractId, rating: 5 })
  check("avaliar antes de concluir bloqueado (409)", earlyReview.status === 409, earlyReview.status)

  const completed = await pro(`/api/app/professional/services/${contractId}/complete`, {
    method: "POST",
  })
  const completedBody = (await completed.json()) as { service?: { status: string } }
  check(
    "serviço concluído (COMPLETED)",
    completed.status === 200 && completedBody.service?.status === "COMPLETED",
    { status: completed.status, body: completedBody },
  )

  const reqAfterComplete = await prisma.serviceRequest.findUnique({
    where: { id: coveredId },
    select: { status: true },
  })
  check("solicitação concluída (COMPLETED)", reqAfterComplete?.status === "COMPLETED", reqAfterComplete)

  // --- Avaliação do cliente + atualização da reputação ---
  const reviewRes = await review({
    serviceContractId: contractId,
    rating: 5,
    comment: "Excelente atendimento. Chegou no horário e resolveu rapidamente.",
  })
  check("cliente avalia serviço concluído (201)", reviewRes.status === 201, reviewRes.status)

  const proProfile = await prisma.professionalProfile.findUnique({
    where: { id: profileId! },
    select: { ratingAverage: true, ratingCount: true },
  })
  check(
    "reputação do profissional atualizada",
    Number(proProfile?.ratingAverage) === 5 && proProfile?.ratingCount === 1,
    proProfile,
  )

  const dupReview = await review({ serviceContractId: contractId, rating: 4 })
  check("avaliação duplicada bloqueada (409)", dupReview.status === 409, dupReview.status)

  const proReview = await review({ serviceContractId: contractId, rating: 5 }, pro)
  check("profissional não avalia (403)", proReview.status === 403, proReview.status)

  const reviewNotif = await prisma.notification.count({
    where: { user: { email: proEmail }, type: "REVIEW_RECEIVED" },
  })
  check("notificação de avaliação criada", reviewNotif === 1, reviewNotif)

  // 16. Fluxo de recusa em uma nova solicitação (continua aberta).
  const second = await createRequest(coveredCityId, "Segundo serviço na cidade coberta")
  const secondId = second.request!.id
  const secondProposal = (await (
    await sendProposal({
      serviceRequestId: secondId,
      price: 250,
      message: "Proposta para a segunda solicitação, que será recusada pelo cliente.",
    })
  ).json()) as { proposal?: { id: string } }
  const secondProposalId = secondProposal.proposal!.id

  const rejected = await reject(secondProposalId)
  const rejectedBody = (await rejected.json()) as { proposal?: { status: string } }
  check(
    "proposta recusada (REJECTED)",
    rejected.status === 200 && rejectedBody.proposal?.status === "REJECTED",
    { status: rejected.status, body: rejectedBody },
  )

  const secondRow = await prisma.serviceRequest.findUnique({
    where: { id: secondId },
    select: { status: true },
  })
  check("solicitação recusada continua aberta (OPEN)", secondRow?.status === "OPEN", secondRow)

  // Mesmo aberta para outros, ela não deve voltar às oportunidades de quem foi recusado.
  const feedAfterReject = (await (await pro("/api/app/opportunities")).json()) as {
    opportunities: { id: string }[]
  }
  check(
    "solicitação recusada some das oportunidades do profissional",
    feedAfterReject.opportunities.every((item) => item.id !== secondId),
    feedAfterReject.opportunities.map((item) => item.id),
  )

  const acceptAfterReject = await accept(secondProposalId)
  check("aceitar após recusar bloqueado (409)", acceptAfterReject.status === 409, acceptAfterReject.status)

  const rejectNotif = await prisma.notification.count({
    where: { user: { email: proEmail }, type: "PROPOSAL_REJECTED" },
  })
  check("notificação de recusa criada", rejectNotif === 1, rejectNotif)

  // --- Central de notificações ---
  const proNotifs = (await (await pro("/api/app/notifications")).json()) as {
    notifications: { read: boolean }[]
    unreadCount: number
  }
  check(
    "profissional lista notificações com não lidas",
    proNotifs.notifications.length > 0 && proNotifs.unreadCount > 0,
    { count: proNotifs.notifications.length, unread: proNotifs.unreadCount },
  )

  const markRead = await pro("/api/app/notifications/read", { method: "POST" })
  check("marcar notificações como lidas (200)", markRead.status === 200, markRead.status)

  const afterRead = (await (await pro("/api/app/notifications")).json()) as { unreadCount: number }
  check("não lidas zeradas após abrir a central", afterRead.unreadCount === 0, afterRead.unreadCount)

  // --- Registro de token de push ---
  const pushToken = `ExponentPushToken[smoke-${suffix}]`
  const registerToken = await pro("/api/app/push-tokens", {
    method: "POST",
    headers: json({}),
    body: JSON.stringify({ token: pushToken, platform: "android" }),
  })
  check("registro de token de push (200)", registerToken.status === 200, registerToken.status)

  const storedToken = await prisma.devicePushToken.findUnique({
    where: { token: pushToken },
    select: { user: { select: { email: true } } },
  })
  check(
    "token de push vinculado ao usuário",
    storedToken?.user.email === proEmail,
    storedToken,
  )

  // --- Cancelamento de proposta (profissional, enquanto PENDING) ---
  const third = await createRequest(coveredCityId, "Terceiro serviço na cidade coberta")
  const thirdId = third.request!.id
  const thirdProposal = (await (
    await sendProposal({
      serviceRequestId: thirdId,
      price: 300,
      message: "Proposta que o próprio profissional vai cancelar antes da resposta.",
    })
  ).json()) as { proposal?: { id: string } }
  const thirdProposalId = thirdProposal.proposal!.id

  const canceledProposal = await pro(`/api/app/proposals/${thirdProposalId}/cancel`, {
    method: "POST",
  })
  const canceledProposalBody = (await canceledProposal.json()) as { proposal?: { status: string } }
  check(
    "profissional cancela proposta pendente (CANCELED)",
    canceledProposal.status === 200 && canceledProposalBody.proposal?.status === "CANCELED",
    { status: canceledProposal.status, body: canceledProposalBody },
  )

  const recancel = await pro(`/api/app/proposals/${thirdProposalId}/cancel`, { method: "POST" })
  check("recancelar proposta bloqueado (409)", recancel.status === 409, recancel.status)

  const feedAfterCancel = (await (await pro("/api/app/opportunities")).json()) as {
    opportunities: { id: string }[]
  }
  check(
    "solicitação com proposta cancelada some das oportunidades",
    feedAfterCancel.opportunities.every((item) => item.id !== thirdId),
    feedAfterCancel.opportunities.map((item) => item.id),
  )

  // --- Cancelamento de serviço (contrato) pelo cliente, com motivo ---
  const fourth = await createRequest(coveredCityId, "Quarto serviço na cidade coberta")
  const fourthId = fourth.request!.id
  const fourthProposal = (await (
    await sendProposal({
      serviceRequestId: fourthId,
      price: 400,
      message: "Proposta que será aceita e depois o serviço será cancelado pelo cliente.",
    })
  ).json()) as { proposal?: { id: string } }
  const fourthProposalId = fourthProposal.proposal!.id
  await accept(fourthProposalId)

  const fourthContract = await prisma.serviceContract.findUnique({
    where: { serviceRequestId: fourthId },
    select: { id: true },
  })
  const fourthContractId = fourthContract!.id

  const proCannotCancelOther = await req(`/api/app/contracts/${fourthContractId}/cancel`, "outsider-ip", {
    method: "POST",
  })
  check("estranho não cancela contrato (401/403)", [401, 403].includes(proCannotCancelOther.status), proCannotCancelOther.status)

  const canceledContract = await client(`/api/app/contracts/${fourthContractId}/cancel`, {
    method: "POST",
    headers: json({}),
    body: JSON.stringify({ reason: "Imprevisto, preciso remarcar." }),
  })
  check("cliente cancela serviço (200)", canceledContract.status === 200, canceledContract.status)

  const fourthRow = await prisma.serviceContract.findUnique({
    where: { id: fourthContractId },
    select: { status: true, canceledBy: true, cancelReason: true, serviceRequest: { select: { status: true } } },
  })
  check(
    "contrato cancelado com auditoria (quem/motivo)",
    fourthRow?.status === "CANCELED" &&
      Boolean(fourthRow?.canceledBy) &&
      fourthRow?.cancelReason === "Imprevisto, preciso remarcar." &&
      fourthRow?.serviceRequest.status === "CANCELED",
    fourthRow,
  )

  const recancelContract = await client(`/api/app/contracts/${fourthContractId}/cancel`, { method: "POST" })
  check("recancelar serviço bloqueado (409)", recancelContract.status === 409, recancelContract.status)

  const cancelNotif = await prisma.notification.count({
    where: { user: { email: proEmail }, title: "Serviço cancelado" },
  })
  check("notificação de cancelamento criada", cancelNotif === 1, cancelNotif)

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
