// Smoke test do perfil do profissional (rotas /api/app/professional/*).
// Cria um profissional descartável, valida o e-mail no banco e exercita:
// leitura -> edição de dados -> categorias -> cidades -> validação -> reviews.
//
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/professional-profile-smoke.ts

import { prisma } from "@santiago/database"

import { app } from "../apps/api/src/http/app"

const baseUrl = "http://localhost:3333"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()
const ip = `pp-smoke-${suffix}`
const email = `pp_pro_${suffix}@example.com`
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

function req(path: string, init: RequestInit = {}) {
  return app.request(`${baseUrl}${path}`, {
    ...init,
    headers: { origin, "x-forwarded-for": ip, ...init.headers },
  })
}

async function main() {
  const username = `pp_pro_${suffix}`

  await req("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: username, username, displayUsername: username, email, password, role: "PROFESSIONAL" }),
  })

  await prisma.user.update({ where: { email }, data: { emailVerified: true } })

  const signIn = await req("/api/auth/sign-in/email", {
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

  const authed = (path: string, init: RequestInit = {}) =>
    req(path, { ...init, headers: { cookie, ...init.headers } })

  const json = (init: RequestInit) => ({ "content-type": "application/json", ...(init.headers ?? {}) })

  // 1. Perfil inicial: vazio, sem avaliações.
  const initial = (await (await authed("/api/app/professional/profile")).json()) as {
    profile: { categories: unknown[]; cities: unknown[]; ratingCount: number; stats: { servicesCompleted: number } }
  }
  check(
    "perfil inicial vazio",
    initial.profile.categories.length === 0 &&
      initial.profile.cities.length === 0 &&
      initial.profile.ratingCount === 0 &&
      initial.profile.stats.servicesCompleted === 0,
    initial.profile,
  )

  // 2. Edita informações pessoais.
  const updated = (await (
    await authed("/api/app/professional/profile", {
      method: "PATCH",
      headers: json({}),
      body: JSON.stringify({
        name: "João da Silva",
        displayName: "João Eletricista",
        phone: "(48) 99999-1234",
        bio: "Atuo com instalações elétricas há mais de 10 anos.",
      }),
    })
  ).json()) as { profile: { name: string; displayName: string; phone: string; bio: string } }
  check("PATCH atualiza nome", updated.profile.name === "João da Silva", updated.profile)
  check("PATCH normaliza telefone (dígitos)", updated.profile.phone === "48999991234", updated.profile)
  check("PATCH salva bio", Boolean(updated.profile.bio), updated.profile)

  // 3. Telefone inválido -> 400.
  const invalidPhone = await authed("/api/app/professional/profile", {
    method: "PATCH",
    headers: json({}),
    body: JSON.stringify({ name: "João da Silva", phone: "123" }),
  })
  check("telefone inválido 400", invalidPhone.status === 400, invalidPhone.status)

  // 4. Categorias e cidades.
  const categories = (await (await authed("/api/app/categories")).json()) as { categories: { id: string }[] }
  const cities = (await (await authed("/api/app/cities")).json()) as { cities: { id: string }[] }
  const categoryId = categories.categories[0]!.id
  const cityId = cities.cities[0]!.id

  const withCategory = (await (
    await authed("/api/app/professional/categories", {
      method: "PUT",
      headers: json({}),
      body: JSON.stringify({ categoryIds: [categoryId] }),
    })
  ).json()) as { profile: { categories: { id: string }[]; mainCategory: string | null } }
  check(
    "PUT categorias persiste",
    withCategory.profile.categories.some((item) => item.id === categoryId) &&
      Boolean(withCategory.profile.mainCategory),
    withCategory.profile,
  )

  const withCity = (await (
    await authed("/api/app/professional/cities", {
      method: "PUT",
      headers: json({}),
      body: JSON.stringify({ cityIds: [cityId] }),
    })
  ).json()) as { profile: { cities: { id: string }[] } }
  check("PUT cidades persiste", withCity.profile.cities.some((item) => item.id === cityId), withCity.profile)

  // 5. Categoria inválida -> 400.
  const invalidCategory = await authed("/api/app/professional/categories", {
    method: "PUT",
    headers: json({}),
    body: JSON.stringify({ categoryIds: ["00000000-0000-0000-0000-000000000000"] }),
  })
  check("categoria inválida 400", invalidCategory.status === 400, invalidCategory.status)

  // 6. Reviews vazias.
  const reviews = (await (await authed("/api/app/professional/reviews")).json()) as {
    reviews: unknown[]
  }
  check("reviews vazias", reviews.reviews.length === 0)

  // 7. Persistência no banco (nome e bio).
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { name: true, professionalProfile: { select: { bio: true } } },
  })
  check(
    "persistido no banco",
    dbUser?.name === "João da Silva" && Boolean(dbUser?.professionalProfile?.bio),
    dbUser,
  )

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
