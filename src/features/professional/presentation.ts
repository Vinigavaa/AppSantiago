// Rótulo de apresentação do profissional: a profissão livre quando preenchida;
// caso contrário, a categoria principal (fallback). Retorna null quando não há
// nenhuma das duas — as telas então não mostram subtítulo.
//
// Fonte única para não divergir entre cartões, perfil e chat.
export function presentationLabel(
  profession: string | null | undefined,
  fallbackCategory: string | null | undefined,
): string | null {
  const trimmed = profession?.trim()
  if (trimmed) {
    return trimmed
  }
  return fallbackCategory ?? null
}
