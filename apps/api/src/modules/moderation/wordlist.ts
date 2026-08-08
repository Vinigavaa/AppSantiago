// Termos proibidos em conteúdo gerado por usuário. A lista é deliberadamente curta
// e conservadora: só entra aqui o que é ofensivo em qualquer contexto. Termo
// ambíguo gera falso positivo e trava usuário legítimo — na dúvida, fica de fora e
// o caso é tratado por denúncia manual.
//
// Escreva sempre em minúsculas e sem acento: a comparação normaliza o texto do
// usuário antes de comparar (ver `text-filter.ts`), então "Pução" casa com "pucao".
// O casamento é por palavra inteira, então "cu" não bloqueia "curso".
//
// Esta lista NUNCA é exposta por endpoint público.
export const offensiveTerms: string[] = [
  // Xingamentos e agressões diretas
  "arrombado",
  "arrombada",
  "babaca",
  "buceta",
  "caralho",
  "corno",
  "cuzao",
  "desgracado",
  "escroto",
  "fdp",
  "filho da puta",
  "foda-se",
  "foda se",
  "otario",
  "otaria",
  "pau no cu",
  "piranha",
  "porra",
  "punheta",
  "puta",
  "puta que pariu",
  "vagabundo",
  "vagabunda",
  "vai se foder",
  "vai tomar no cu",
  "viado",

  // Discurso de ódio (racismo, homofobia, capacitismo, xenofobia)
  "bicha",
  "macaco preto",
  "mongoloide",
  "nazista",
  "preto imundo",
  "retardado",
  "sapatao",
  "traveco",
  "viadinho",

  // Conteúdo sexual explícito
  "nudes",
  "pau duro",
  "pornografia",
  "porno",
  "sexo por dinheiro",
  "siririca",
  "xoxota",

  // Ameaça e violência
  "te matar",
  "vou te matar",
  "vou te quebrar",
  "vou te pegar na rua",
  "sabe onde voce mora",
]
