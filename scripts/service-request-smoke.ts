// Smoke test do fluxo de criação de solicitação (rota /api/app).
// Cria um usuário descartável, confirma o email direto no banco, faz login para
// obter o cookie de sessão e exercita criar -> listar -> resumo.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/service-request-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()
const ip = `sr-smoke-${suffix}`
const email = `sr_smoke_${suffix}@example.com`
const username = `sr_smoke_${suffix}`
const password = "Password123!"

function req(path: string, init: RequestInit = {}) {
  return app.request(`${baseUrl}${path}`, {
    ...init,
    headers: { origin, "x-forwarded-for": ip, ...init.headers },
  })
}

let failures = 0

function check(label: string, condition: boolean, detail?: unknown) {
  const status = condition ? "PASS" : "FAIL"
  console.log(`[${status}] ${label}`)
  if (!condition) {
    failures += 1
    if (detail !== undefined) {
      console.log("       detail:", JSON.stringify(detail))
    }
  }
}

async function main() {
  // 1. Cadastro
  const signUp = await req("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: username, username, displayUsername: username, email, password, role: "CLIENT" }),
  })
  check("sign-up 200", signUp.status === 200, signUp.status)

  // 2. Confirma email direto no banco (atalho de teste)
  await prisma.user.update({ where: { email }, data: { emailVerified: true } })

  // 3. Login -> captura cookie
  const signIn = await req("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  check("sign-in 200", signIn.status === 200, signIn.status)
  const setCookie = signIn.headers.get("set-cookie") ?? ""
  const cookie = setCookie.split(",").map((part) => part.split(";")[0]?.trim()).filter(Boolean).join("; ")
  check("session cookie present", cookie.length > 0)

  const authed = (path: string, init: RequestInit = {}) =>
    req(path, { ...init, headers: { cookie, ...init.headers } })

  // 4. Catálogo
  const categoriesRes = await authed("/api/app/categories")
  const categoriesBody = (await categoriesRes.json()) as { categories: { id: string }[] }
  check("categories list", categoriesRes.status === 200 && categoriesBody.categories.length > 0)

  const citiesRes = await authed("/api/app/cities")
  const citiesBody = (await citiesRes.json()) as { cities: { id: string }[] }
  check("cities list", citiesRes.status === 200 && citiesBody.cities.length > 0)

  const categoryId = categoriesBody.categories[0]!.id
  const cityId = citiesBody.cities[0]!.id

  // 5. Criação
  const createRes = await authed("/api/app/service-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      categoryId,
      cityId,
      title: "Pintar sala e dois quartos",
      description: "Preciso pintar a sala e dois quartos, paredes já preparadas, tinta inclusa.",
      zipCode: "88801-000",
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Centro",
      complement: "Apto 4",
      urgency: "THIS_WEEK",
      budgetMin: 900,
      budgetMax: 1400,
    }),
  })
  const createBody = (await createRes.json()) as { request?: { id: string; budgetMin: number | null } }
  check("create 201", createRes.status === 201, createBody)
  check("created has id", Boolean(createBody.request?.id))
  check("budget persisted", createBody.request?.budgetMin === 900)

  // 6. Validação de campo inválido (descrição curta)
  const invalidRes = await authed("/api/app/service-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ categoryId, cityId, title: "abc", description: "curta", urgency: "URGENT" }),
  })
  check("invalid payload 400", invalidRes.status === 400, invalidRes.status)

  // 7. Listagem mostra a nova solicitação
  const listRes = await authed("/api/app/service-requests")
  const listBody = (await listRes.json()) as { requests: { id: string }[] }
  check("list includes created", listBody.requests.some((r) => r.id === createBody.request?.id))

  // 8. Resumo conta a solicitação aberta
  const summaryRes = await authed("/api/app/service-requests/summary")
  const summaryBody = (await summaryRes.json()) as { openRequests: number }
  check("summary openRequests >= 1", summaryBody.openRequests >= 1, summaryBody)

  // 9. Persistência: a solicitação existe no banco vinculada ao cliente correto
  const dbRow = await prisma.serviceRequest.findFirst({
    where: { id: createBody.request?.id, client: { user: { email } } },
    select: { id: true, status: true },
  })
  check("persisted & owned by client", dbRow?.status === "OPEN", dbRow)

  // Limpeza
  await prisma.user.delete({ where: { email } }).catch(() => {})

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  await prisma.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
