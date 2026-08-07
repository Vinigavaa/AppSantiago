import { Redirect, useLocalSearchParams } from "expo-router"

import { routes } from "@/constants/routes"
import { PublicProfessionalScreen } from "@/features/professional/PublicProfessionalScreen"

export default function ProfessionalProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!id) {
    return <Redirect href={routes.home} />
  }

  // Esta tela é uma `Tabs.Screen` (href: null), ou seja, um singleton: ao navegar
  // de um profissional para outro a instância não desmonta e o estado do perfil
  // anterior continuaria na tela até a nova requisição responder. O `key` força a
  // remontagem a cada `id`, então o usuário vê o carregamento e depois o perfil
  // certo — nunca o profissional anterior.
  return <PublicProfessionalScreen id={id} key={id} />
}
