import { ReviewList } from "@/features/client-home/components/ReviewList"

import type { ProfessionalReview } from "../types"

type Props = {
  reviews: ProfessionalReview[]
  isLoading: boolean
  error: string | null
}

// Avaliações recebidas pelo profissional. Reusa a lista compartilhada; o formato
// de ProfessionalReview coincide com ReviewItem.
export function ReviewsSection({ reviews, isLoading, error }: Props) {
  return (
    <ReviewList
      emptyDescription="Quando os clientes avaliarem seus serviços, os comentários aparecerão aqui."
      emptyTitle="Você ainda não recebeu avaliações."
      error={error}
      isLoading={isLoading}
      reviews={reviews}
    />
  )
}
