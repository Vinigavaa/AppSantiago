import { Redirect, useLocalSearchParams } from "expo-router"

import { routes } from "@/constants/routes"
import { PublicProfessionalScreen } from "@/features/professional/PublicProfessionalScreen"

export default function ProfessionalProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!id) {
    return <Redirect href={routes.home} />
  }

  return <PublicProfessionalScreen id={id} />
}
