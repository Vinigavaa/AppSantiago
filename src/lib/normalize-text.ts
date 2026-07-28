// Normaliza texto para comparação insensível a acento e caixa (NFD + remoção de
// diacríticos + minúsculo). Usado em filtros de busca client-side, como o seletor
// de categorias. Espelha a normalização do backend para cidades.
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}
