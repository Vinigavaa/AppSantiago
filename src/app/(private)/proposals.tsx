import { useMarkAreaRead } from "@/features/notifications/badges-context"
import { ReceivedProposalsScreen } from "@/features/proposals/ReceivedProposalsScreen"

export default function Proposals() {
  useMarkAreaRead("proposals")

  return <ReceivedProposalsScreen />
}
