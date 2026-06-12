import { prisma } from "../src/client"

const categories = [
  {
    name: "Pedreiro",
    slug: "pedreiro",
    description: "Serviços de construção, reformas e reparos gerais.",
  },
  {
    name: "Eletricista",
    slug: "eletricista",
    description: "Instalação, manutenção e reparos elétricos.",
  },
  {
    name: "Encanador",
    slug: "encanador",
    description: "Instalação e manutenção hidráulica.",
  },
  {
    name: "Pintor",
    slug: "pintor",
    description: "Pintura residencial, comercial e acabamentos.",
  },
  {
    name: "Marceneiro",
    slug: "marceneiro",
    description: "Móveis planejados, reparos e serviços em madeira.",
  },
  {
    name: "Jardineiro",
    slug: "jardineiro",
    description: "Jardinagem, manutenção de áreas verdes e paisagismo.",
  },
  {
    name: "Diarista",
    slug: "diarista",
    description: "Limpeza residencial e organização de ambientes.",
  },
  {
    name: "Técnico em ar-condicionado",
    slug: "tecnico-em-ar-condicionado",
    description: "Instalação, limpeza e manutenção de ar-condicionado.",
  },
  {
    name: "Mecânico",
    slug: "mecanico",
    description: "Manutenção e reparos automotivos.",
  },
  {
    name: "Montador de móveis",
    slug: "montador-de-moveis",
    description: "Montagem, desmontagem e ajuste de móveis.",
  },
]

const cities = [
  { name: "Criciúma", state: "SC" },
  { name: "Forquilhinha", state: "SC" },
  { name: "Içara", state: "SC" },
  { name: "Nova Veneza", state: "SC" },
  { name: "Siderópolis", state: "SC" },
  { name: "Araranguá", state: "SC" },
  { name: "Florianópolis", state: "SC" },
]

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    })
  }

  for (const city of cities) {
    await prisma.city.upsert({
      where: {
        name_state: {
          name: city.name,
          state: city.state,
        },
      },
      update: {},
      create: city,
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
