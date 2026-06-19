// Ferramenta de desenvolvimento (não faz parte do app).
// Atribui TODAS as categorias ativas e TODAS as cidades a um profissional, para
// permitir testar o feed de oportunidades enquanto a tela de edição de atuação
// ainda não existe.
//
//   npx tsx --tsconfig apps/api/tsconfig.json scripts/grant-professional-coverage.ts <email>

import { prisma } from "@santiago/database"

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error("Informe o e-mail do profissional: ... grant-professional-coverage.ts <email>")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, professionalProfile: { select: { id: true } } },
  })

  if (!user) {
    console.error(`Usuário não encontrado: ${email}`)
    process.exit(1)
  }

  const profileId = user.professionalProfile?.id

  if (user.role !== "PROFESSIONAL" || !profileId) {
    console.error(`Usuário ${email} não é um profissional com perfil válido (role=${user.role}).`)
    process.exit(1)
  }

  const [categories, cities] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.city.findMany({ select: { id: true } }),
  ])

  await Promise.all([
    prisma.professionalCategory.createMany({
      data: categories.map((category) => ({ professionalId: profileId, categoryId: category.id })),
      skipDuplicates: true,
    }),
    prisma.professionalCity.createMany({
      data: cities.map((city) => ({ professionalId: profileId, cityId: city.id })),
      skipDuplicates: true,
    }),
  ])

  console.log(
    `Cobertura aplicada a ${email}: ${categories.length} categorias e ${cities.length} cidades.`,
  )

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
