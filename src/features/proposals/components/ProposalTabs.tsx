import { SegmentedTabs } from "@/features/client-home/components/SegmentedTabs"

export type ProposalTabKey = "pending" | "accepted" | "closed"

const TABS: { key: ProposalTabKey; label: string }[] = [
  { key: "pending", label: "Pendentes" },
  { key: "accepted", label: "Aceitas" },
  { key: "closed", label: "Recusadas" },
]

type Props = {
  active: ProposalTabKey
  counts: Record<ProposalTabKey, number>
  onSelect: (key: ProposalTabKey) => void
}

// Abas das "Propostas Recebidas" do cliente. Reusa o visual de abas do app.
export function ProposalTabs({ active, counts, onSelect }: Props) {
  return (
    <SegmentedTabs
      active={active}
      onSelect={onSelect}
      tabs={TABS.map((tab) => ({ ...tab, count: counts[tab.key] }))}
    />
  )
}
