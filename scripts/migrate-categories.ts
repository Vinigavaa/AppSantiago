// Migração das categorias antigas (tipo-profissão) para o catálogo amplo novo.
// Roda UMA vez, após o seed do catálogo novo, em produção. Idempotente: se as
// antigas já estão desativadas/migradas, não faz nada de novo.
//
//   npm run categories:migrate
//
// O que faz, em transação (tudo ou nada):
//  1. Repoe as referências de ServiceRequest.categoryId (antiga -> nova).
//  2. Repoe ProfessionalCategory (antiga -> nova) sem violar a unicidade
//     (professionalId, categoryId): se o profissional já tem a nova, só remove a
//     antiga; senão, aponta a antiga para a nova.
//  3. Desativa as categorias antigas (isActive: false). Não remove nada do banco.

import { prisma } from "@santiago/database"

// Mapa fixo antigas (slug) -> novas (slug). As novas precisam existir (seed).
const MIGRATION_MAP: Record<string, string> = {
  pedreiro: "construcao-civil",
  eletricista: "eletrica",
  encanador: "hidraulica",
  pintor: "pintura",
  marceneiro: "marcenaria",
  jardineiro: "jardinagem",
  diarista: "limpeza-residencial",
  "tecnico-em-ar-condicionado": "ar-condicionado",
  mecanico: "mecanica-automotiva",
  "montador-de-moveis": "montagem-de-moveis",
}

async function main() {
  const slugs = [...Object.keys(MIGRATION_MAP), ...Object.values(MIGRATION_MAP)]

  const categories = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, isActive: true },
  })

  const idBySlug = new Map(categories.map((category) => [category.slug, category.id]))

  // Valida que todas as novas existem antes de tocar em dados.
  const missingNew = [...new Set(Object.values(MIGRATION_MAP))].filter(
    (slug) => !idBySlug.has(slug),
  )

  if (missingNew.length > 0) {
    console.error(
      `Categorias novas ausentes (rode o seed antes): ${missingNew.join(", ")}`,
    )
    process.exit(1)
  }

  let requestsMoved = 0
  let proProfilesMoved = 0
  let proDuplicatesRemoved = 0
  const deactivated: string[] = []

  await prisma.$transaction(async (tx) => {
    for (const [oldSlug, newSlug] of Object.entries(MIGRATION_MAP)) {
      const oldId = idBySlug.get(oldSlug)
      const newId = idBySlug.get(newSlug)

      // Categoria antiga não existe no banco (nada a migrar).
      if (!oldId || !newId) {
        continue
      }

      // 1. Solicitações: repontar direto (não há unicidade a violar).
      const requests = await tx.serviceRequest.updateMany({
        where: { categoryId: oldId },
        data: { categoryId: newId },
      })
      requestsMoved += requests.count

      // 2. Vínculos de profissionais: mover só quem ainda não tem a nova.
      const oldLinks = await tx.professionalCategory.findMany({
        where: { categoryId: oldId },
        select: { id: true, professionalId: true },
      })

      if (oldLinks.length > 0) {
        const professionalIds = oldLinks.map((link) => link.professionalId)

        const alreadyNew = await tx.professionalCategory.findMany({
          where: { categoryId: newId, professionalId: { in: professionalIds } },
          select: { professionalId: true },
        })
        const hasNew = new Set(alreadyNew.map((link) => link.professionalId))

        const toMove = oldLinks.filter((link) => !hasNew.has(link.professionalId))
        const toRemove = oldLinks.filter((link) => hasNew.has(link.professionalId))

        if (toMove.length > 0) {
          await tx.professionalCategory.updateMany({
            where: { id: { in: toMove.map((link) => link.id) } },
            data: { categoryId: newId },
          })
          proProfilesMoved += toMove.length
        }

        if (toRemove.length > 0) {
          await tx.professionalCategory.deleteMany({
            where: { id: { in: toRemove.map((link) => link.id) } },
          })
          proDuplicatesRemoved += toRemove.length
        }
      }

      // 3. Desativa a antiga (não remove: preserva integridade histórica).
      await tx.category.update({ where: { id: oldId }, data: { isActive: false } })
      deactivated.push(oldSlug)
    }
    // Timeout generoso: são muitas queries sequenciais e o banco (Neon) tem
    // latência de rede por query; o padrão de 5s estoura. É uma migração única.
  }, { maxWait: 15000, timeout: 120000 })

  console.log("Migração de categorias concluída:")
  console.log(`  Solicitações repontadas: ${requestsMoved}`)
  console.log(`  Vínculos de profissionais movidos: ${proProfilesMoved}`)
  console.log(`  Vínculos duplicados removidos: ${proDuplicatesRemoved}`)
  console.log(`  Categorias antigas desativadas: ${deactivated.length}`)

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
