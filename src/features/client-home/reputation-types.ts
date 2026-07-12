// Tipos de reputação compartilhados entre cliente e profissional. Ficam na
// feature base (client-home) para que ambos os lados reusem sem duplicar.
export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>

// Item de avaliação exibido em uma lista de reputação (perfil do cliente ou do
// profissional). Formato único para não duplicar o cartão de avaliação.
export type ReviewItem = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  serviceTitle: string
  serviceCategory: string
}
