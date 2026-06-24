// Smoke test da área do profissional (rotas /api/app).
// Cria um cliente e um profissional descartáveis, valida o e-mail direto no
// banco, e exercita: oportunidades vazias sem cobertura -> com cobertura ->
// filtro por categoria/cidade -> detalhe -> dashboard -> perfil.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/opportunities-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()

const clientEmail = `op_client_${suffix}@example.com`
const proEmail = `op_pro_${suffix}@example.com`
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
  const clientIp = `op-client-${suffix}`
  const proIp = `op-pro-${suffix}`

  const client = await signUpAndLogin(clientEmail, "CLIENT", clientIp)
  const pro = await signUpAndLogin(proEmail, "PROFESSIONAL", proIp)

  // Catálogo (duas cidades distintas: uma coberta, outra não).
  const categories = (await (await client("/api/app/categories")).json()) as {
    categories: { id: string }[]
  }
  const cities = (await (await client("/api/app/cities")).json()) as {
    cities: { id: string }[]
  }
  const categoryId = categories.categories[0]!.id
  const coveredCityId = cities.cities[0]!.id
  const otherCityId = cities.cities[1]!.id

  // Cliente cria duas solicitações: uma na cidade coberta, outra fora.
  async function createRequest(cityId: string, title: string) {
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
    return (await res.json()) as { request?: { id: string } }
  }

  const coveredRequest = await createRequest(coveredCityId, "Serviço na cidade coberta")
  await createRequest(otherCityId, "Serviço em cidade não atendida")
  check("solicitações criadas", Boolean(coveredRequest.request?.id))

  // Profissional sem cobertura -> nenhuma oportunidade.
  const emptyRes = await pro("/api/app/opportunities")
  const emptyBody = (await emptyRes.json()) as { opportunities: { id: string }[] }
  check("sem cobertura: oportunidades vazias", emptyBody.opportunities.length === 0, emptyBody)

  // Define cobertura: categoria + apenas a cidade coberta.
  const proUser = await prisma.user.findUnique({
    where: { email: proEmail },
    select: { professionalProfile: { select: { id: true } } },
  })
  const profileId = proUser?.professionalProfile?.id
  check("perfil profissional existe", Boolean(profileId))
  await prisma.professionalCategory.create({ data: { professionalId: profileId!, categoryId } })
  await prisma.professionalCity.create({ data: { professionalId: profileId!, cityId: coveredCityId } })

  // Com cobertura -> vê a solicitação da cidade coberta, mas não a de fora.
  const feedRes = await pro("/api/app/opportunities")
  const feedBody = (await feedRes.json()) as {
    opportunities: { id: string; title: string }[]
  }
  check(
    "com cobertura: vê a solicitação coberta",
    feedBody.opportunities.some((item) => item.id === coveredRequest.request?.id),
  )
  check(
    "filtro por região: não vê cidade não atendida",
    feedBody.opportunities.every((item) => item.title !== "Serviço em cidade não atendida"),
    feedBody,
  )

  // Detalhe da oportunidade.
  const detailRes = await pro(`/api/app/opportunities/${coveredRequest.request?.id}`)
  const detailBody = (await detailRes.json()) as { opportunity?: { id: string } }
  check("detalhe da oportunidade", detailBody.opportunity?.id === coveredRequest.request?.id)

  // Dashboard (zeros para conta nova) e perfil.
  const dashboard = (await (await pro("/api/app/professional/dashboard")).json()) as {
    completedThisMonth: number
    proposalsThisMonth: number
  }
  check(
    "dashboard inicial zerado",
    dashboard.completedThisMonth === 0 && dashboard.proposalsThisMonth === 0,
    dashboard,
  )

  const profile = (await (await pro("/api/app/professional/profile")).json()) as {
    profile: { mainCategory: string | null; cities: unknown[] }
  }
  check(
    "perfil traz categoria e cidade",
    Boolean(profile.profile.mainCategory) && profile.profile.cities.length === 1,
    profile,
  )

  // Cliente não pode acessar oportunidades (403).
  const forbidden = await client("/api/app/opportunities")
  check("cliente bloqueado em oportunidades (403)", forbidden.status === 403, forbidden.status)

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
