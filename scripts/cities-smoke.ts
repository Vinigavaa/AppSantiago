// Smoke da base de cidades: valida a normalização (busca sem acento/caixa) e a
// integridade do dataset oficial do IBGE. Roda offline, sem banco.
//
//   npm run cities:smoke
//
// Sai com código 1 no primeiro problema, para servir de gate simples.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { normalizeCityName } from "@santiago/database"

let failures = 0

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok  ${label}`)
  } else {
    failures++
    console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`)
  }
}

console.log("\n[1] normalizeCityName")
check('"Criciúma" → "criciuma"', normalizeCityName("Criciúma") === "criciuma")
check('"SÃO PAULO" → "sao paulo"', normalizeCityName("SÃO PAULO") === "sao paulo")
check('"Içara" → "icara"', normalizeCityName("Içara") === "icara")
check('"  Florianópolis  " trim', normalizeCityName("  Florianópolis  ") === "florianopolis")
check(
  '"Belo Horizonte" preserva espaço',
  normalizeCityName("Belo Horizonte") === "belo horizonte",
)

console.log("\n[2] dataset municipios-ibge.json")
const datasetPath = resolve(
  process.cwd(),
  "packages/database/data/municipios-ibge.json",
)
const rows = JSON.parse(readFileSync(datasetPath, "utf8")) as Array<{
  name: string
  state: string
}>

check("total >= 5565 municípios", rows.length >= 5565, `total=${rows.length}`)

const ufs = new Set(rows.map((r) => r.state))
check("27 UFs presentes", ufs.size === 27, `ufs=${ufs.size}`)

const seen = new Set<string>()
let duplicates = 0
for (const r of rows) {
  const key = `${r.name}|${r.state}`
  if (seen.has(key)) duplicates++
  seen.add(key)
}
check("sem duplicatas (name, state)", duplicates === 0, `dup=${duplicates}`)

const malformed = rows.filter(
  (r) => !r.name || !r.state || r.state.length !== 2,
)
check("todos com name e UF de 2 letras", malformed.length === 0, `ruins=${malformed.length}`)

// As cidades já semeadas antes desta mudança precisam existir na base nova, senão
// o upsert não preserva os IDs referenciados por solicitações/coberturas.
const legado = [
  "Criciúma",
  "Forquilhinha",
  "Içara",
  "Nova Veneza",
  "Siderópolis",
  "Araranguá",
  "Florianópolis",
]
for (const name of legado) {
  check(
    `legado presente: ${name}/SC`,
    rows.some((r) => r.name === name && r.state === "SC"),
  )
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}

console.log("\nTodas as verificações passaram.")
