// Normalização de nomes de cidade para busca insensível a acento e caixa.
// Usada nos DOIS lados: na carga (para preencher City.searchName) e na busca
// (para normalizar o termo digitado). Manter uma única fonte garante simetria —
// se os dois lados normalizarem igual, "criciuma" encontra "Criciúma".
export function normalizeCityName(name: string): string {
  return name
    .normalize("NFD") // separa letra do diacrítico (ex.: "á" → "a" + acento)
    .replace(/[̀-ͯ]/g, "") // remove os diacríticos (combining marks)
    .toLowerCase()
    .trim()
}
