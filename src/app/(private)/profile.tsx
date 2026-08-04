import { ClientProfileScreen } from "@/features/client-home/ClientProfileScreen"
import { useMarkAreaRead } from "@/features/notifications/badges-context"
import { ProfessionalProfileScreen } from "@/features/professional/ProfessionalProfileScreen"
import { authClient } from "@/lib/auth-client"

export default function Profile() {
  const { data: session } = authClient.useSession()

  // Avaliações recebidas e avisos do sistema aparecem aqui, nos dois perfis.
  useMarkAreaRead("profile")

  if (session?.user.role === "PROFESSIONAL") {
    return <ProfessionalProfileScreen />
  }

  return <ClientProfileScreen />
}
