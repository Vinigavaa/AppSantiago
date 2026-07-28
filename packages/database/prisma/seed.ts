import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { prisma } from "../src/client"
import { normalizeCityName } from "../src/normalize"

type CityRow = { name: string; state: string }

// Base oficial de municípios do IBGE, versionada no repo (carga determinística,
// sem depender de rede no deploy). Ver packages/database/data/municipios-ibge.json.
function loadCities(): CityRow[] {
  const path = resolve(__dirname, "..", "data", "municipios-ibge.json")
  return JSON.parse(readFileSync(path, "utf8")) as CityRow[]
}

// Catálogo amplo de categorias de serviço. Cobre as principais áreas de prestação
// de serviço do Brasil, para que a maioria dos profissionais encontre categorias
// compatíveis. Upsert por slug (idempotente). As antigas categorias tipo-profissão
// são migradas para as equivalentes daqui por scripts/migrate-categories.ts.
const categories = [
  // Construção e reformas
  { name: "Construção Civil", slug: "construcao-civil" },
  { name: "Reformas", slug: "reformas" },
  { name: "Elétrica", slug: "eletrica" },
  { name: "Hidráulica", slug: "hidraulica" },
  { name: "Pintura", slug: "pintura" },
  { name: "Gesso e Drywall", slug: "gesso-e-drywall" },
  { name: "Marcenaria", slug: "marcenaria" },
  { name: "Serralheria", slug: "serralheria" },
  { name: "Vidraçaria", slug: "vidracaria" },
  { name: "Montagem de Móveis", slug: "montagem-de-moveis" },
  // Casa e manutenção
  { name: "Jardinagem", slug: "jardinagem" },
  { name: "Paisagismo", slug: "paisagismo" },
  { name: "Limpeza Residencial", slug: "limpeza-residencial" },
  { name: "Limpeza Comercial", slug: "limpeza-comercial" },
  { name: "Limpeza Pós-Obra", slug: "limpeza-pos-obra" },
  { name: "Dedetização", slug: "dedetizacao" },
  { name: "Mudanças e Fretes", slug: "mudancas-e-fretes" },
  { name: "Transporte", slug: "transporte" },
  // Climatização e técnica
  { name: "Assistência Técnica", slug: "assistencia-tecnica" },
  { name: "Refrigeração", slug: "refrigeracao" },
  { name: "Ar-condicionado", slug: "ar-condicionado" },
  { name: "Energia Solar", slug: "energia-solar" },
  { name: "Segurança Eletrônica", slug: "seguranca-eletronica" },
  { name: "Automação Residencial", slug: "automacao-residencial" },
  { name: "Mecânica Automotiva", slug: "mecanica-automotiva" },
  // Tecnologia
  { name: "Informática", slug: "informatica" },
  { name: "Redes", slug: "redes" },
  { name: "Desenvolvimento de Software", slug: "desenvolvimento-de-software" },
  { name: "Desenvolvimento Mobile", slug: "desenvolvimento-mobile" },
  { name: "Desenvolvimento Web", slug: "desenvolvimento-web" },
  // Criação e marketing
  { name: "Design Gráfico", slug: "design-grafico" },
  { name: "UX/UI Design", slug: "ux-ui-design" },
  { name: "Marketing Digital", slug: "marketing-digital" },
  { name: "Gestão de Redes Sociais", slug: "gestao-de-redes-sociais" },
  { name: "Tráfego Pago", slug: "trafego-pago" },
  { name: "Produção de Conteúdo", slug: "producao-de-conteudo" },
  { name: "Fotografia", slug: "fotografia" },
  { name: "Filmagem", slug: "filmagem" },
  { name: "Edição de Vídeo", slug: "edicao-de-video" },
  { name: "Tradução", slug: "traducao" },
  // Educação e consultoria
  { name: "Aulas Particulares", slug: "aulas-particulares" },
  { name: "Consultoria", slug: "consultoria" },
  { name: "Contabilidade", slug: "contabilidade" },
  { name: "Advocacia", slug: "advocacia" },
  // Saúde e bem-estar
  { name: "Psicologia", slug: "psicologia" },
  { name: "Nutrição", slug: "nutricao" },
  { name: "Personal Trainer", slug: "personal-trainer" },
  // Beleza e estética
  { name: "Estética", slug: "estetica" },
  { name: "Beleza", slug: "beleza" },
  { name: "Maquiagem", slug: "maquiagem" },
  { name: "Barbearia", slug: "barbearia" },
  { name: "Cabeleireiro", slug: "cabeleireiro" },
  { name: "Costura", slug: "costura" },
  // Eventos e música
  { name: "Eventos", slug: "eventos" },
  { name: "Música", slug: "musica" },
  { name: "Buffet", slug: "buffet" },
  // Cuidados e pets
  { name: "Cuidador de Idosos", slug: "cuidador-de-idosos" },
  { name: "Babá", slug: "baba" },
  { name: "Passeador de Pets", slug: "passeador-de-pets" },
  { name: "Adestramento", slug: "adestramento" },
  { name: "Veterinária", slug: "veterinaria" },
]

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      // Não reativa aqui: a desativação das antigas é feita por
      // scripts/migrate-categories.ts. Reativar no update reverteria a migração
      // toda vez que o seed rodasse. As novas nascem ativas pelo default do schema.
      update: { name: category.name },
      create: category,
    })
  }

  // Carga dos municípios: upsert por (name, state). Idempotente — reexecutar não
  // duplica nem troca IDs já referenciados por solicitações/coberturas. O update
  // preenche/atualiza o searchName (também faz o backfill dos municípios antigos).
  const cities = loadCities()
  let processed = 0

  for (const city of cities) {
    const searchName = normalizeCityName(city.name)

    await prisma.city.upsert({
      where: { name_state: { name: city.name, state: city.state } },
      update: { searchName },
      create: { name: city.name, state: city.state, searchName },
    })

    processed++
    if (processed % 500 === 0) {
      console.log(`  cidades: ${processed}/${cities.length}`)
    }
  }

  console.log(`Municípios carregados: ${processed}`)
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
