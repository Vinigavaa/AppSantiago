import { ClientHome } from "@/features/client-home/ClientHome"
import { ProfessionalHome } from "@/features/professional/ProfessionalHome"
import { authClient } from "@/lib/auth-client"

// A Home é o centro de cada jornada. Cliente e profissional têm experiências
// próprias; aqui apenas direcionamos conforme o papel do usuário.
export default function Home() {
  const { data: session } = authClient.useSession()

  if (session?.user.role === "PROFESSIONAL") {
    return <ProfessionalHome />
  }

  return <ClientHome />
}
