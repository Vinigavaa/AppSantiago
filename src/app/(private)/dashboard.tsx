import { useMarkAreaRead } from "@/features/notifications/badges-context"
import { DashboardScreen } from "@/features/professional/DashboardScreen"

export default function Dashboard() {
  useMarkAreaRead("dashboard")

  return <DashboardScreen />
}
