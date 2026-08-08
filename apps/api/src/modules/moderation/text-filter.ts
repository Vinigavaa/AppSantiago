import type { Context } from "hono"

import { offensiveTerms } from "./wordlist"

// Substituições de "leetspeak": trocas comuns para escapar de um filtro simples.
const leetMap: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
}

// Normaliza o texto antes de comparar: minúsculas, sem acento, sem leetspeak, sem
// letras repetidas ("caraaalho" -> "caralho") e com espaçamento colapsado. Os
// termos da lista passam pela mesma normalização, então os dois lados batem.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$]/g, (char) => leetMap[char] ?? char)
    .replace(/(.)\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

// Junta sequências de letras soltas: "p u t a" e "f.d.p" viram "puta" e "fdp".
// Só junta quando cada pedaço tem um caractere só — por isso "reputação" fica
// intacta, em vez de virar um falso positivo ao colar palavras vizinhas.
function joinSpacedLetters(normalized: string): string {
  return normalized.replace(
    /(?<![a-z0-9])(?:[a-z0-9][^a-z0-9]+){2,}[a-z0-9](?![a-z0-9])/g,
    (run) => run.replace(/[^a-z0-9]/g, ""),
  )
}

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Termos preparados uma única vez na carga do módulo. O casamento é por palavra
// inteira, e espaço no termo aceita qualquer espaçamento no texto.
const termPatterns = offensiveTerms.map(
  (term) => new RegExp(`\\b${escapeRegex(normalize(term)).replace(/ /g, "\\s+")}\\b`),
)

// Há termo proibido no texto? A comparação é por palavra inteira, então uma palavra
// legítima que apenas contenha um termo ("curso", "assessoria") não é bloqueada.
export function containsOffensiveText(text: string | null | undefined): boolean {
  if (!text) {
    return false
  }

  const normalized = normalize(text)
  const dejoined = joinSpacedLetters(normalized)

  return termPatterns.some(
    (pattern) => pattern.test(normalized) || pattern.test(dejoined),
  )
}

// Guarda usada pelos handlers: devolve a resposta 400 quando algum dos textos viola
// as regras, ou `null` quando está tudo limpo. O log registra onde e quem, nunca o
// texto rejeitado por inteiro (é conteúdo do usuário).
//
//   const offensive = offensiveTextResponse(context, "chat:message", user.id, [content])
//   if (offensive) return offensive
export function offensiveTextResponse(
  context: Context,
  surface: string,
  userId: string,
  texts: (string | null | undefined)[],
): Response | null {
  if (!texts.some(containsOffensiveText)) {
    return null
  }

  console.warn(`[moderation] conteúdo ofensivo bloqueado surface=${surface} userId=${userId}`)

  return context.json(
    {
      code: "OFFENSIVE_CONTENT",
      message:
        "Seu texto contém conteúdo que viola as regras da comunidade. Revise e envie novamente.",
    },
    400,
  )
}
