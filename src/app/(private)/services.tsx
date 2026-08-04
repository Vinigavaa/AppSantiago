import { useMarkAreaRead } from "@/features/notifications/badges-context"
import { ProfessionalServicesScreen } from "@/features/professional/ProfessionalServicesScreen"

// "Meus Serviços": serviços contratados, em andamento e concluídos do profissional.
export default function Services() {
  useMarkAreaRead("services")

  return <ProfessionalServicesScreen />
}
