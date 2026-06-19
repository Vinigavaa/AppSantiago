import { prisma } from "@santiago/database"

// Cobertura de atuação do profissional: em quais categorias e cidades ele atende.
// Usada para filtrar as oportunidades (solicitações abertas) exibidas a ele.
export type ProfessionalCoverage = {
  profileId: string
  categoryIds: string[]
  cityIds: string[]
}

export async function getProfessionalCoverage(
  userId: string,
): Promise<ProfessionalCoverage | null> {
  const profile = await prisma.professionalProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      categories: { select: { categoryId: true } },
      cities: { select: { cityId: true } },
    },
  })

  if (!profile) {
    return null
  }

  return {
    profileId: profile.id,
    categoryIds: profile.categories.map((item) => item.categoryId),
    cityIds: profile.cities.map((item) => item.cityId),
  }
}

// Garante que o usuário possui um ProfessionalProfile e devolve o id. O perfil já
// é criado no cadastro; o upsert mantém o fluxo robusto para contas antigas.
export async function getOrCreateProfessionalProfileId(userId: string): Promise<string> {
  const profile = await prisma.professionalProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  })

  return profile.id
}
