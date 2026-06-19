import { ClientProfileScreen } from "@/features/client-home/ClientProfileScreen"
import { ProfessionalProfileScreen } from "@/features/professional/ProfessionalProfileScreen"
import { authClient } from "@/lib/auth-client"

export default function Profile() {
  const { data: session } = authClient.useSession()

  if (session?.user.role === "PROFESSIONAL") {
    return <ProfessionalProfileScreen />
  }

  return <ClientProfileScreen />
}
