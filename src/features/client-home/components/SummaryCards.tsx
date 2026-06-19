import type { ClientSummary } from "@/features/service-requests/types"

import { StatCards } from "./StatCards"

type Props = {
  summary: ClientSummary | null
}

export function SummaryCards({ summary }: Props) {
  return (
    <StatCards
      items={[
        { label: "Abertas", value: summary?.openRequests ?? 0 },
        { label: "Propostas", value: summary?.pendingProposals ?? 0 },
        { label: "Concluídos", value: summary?.completedServices ?? 0 },
      ]}
    />
  )
}
