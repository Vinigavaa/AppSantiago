import { router } from "expo-router"

import { routes } from "@/constants/routes"
import { PlaceholderScreen } from "@/features/client-home/components/PlaceholderScreen"

export default function Proposals() {
  return (
    <PlaceholderScreen
      actionLabel="Criar solicitação"
      emptyDescription="Quando profissionais enviarem propostas para suas solicitações, elas aparecerão aqui."
      emptyTitle="Nenhuma proposta ainda"
      icon="document-text-outline"
      onPressAction={() => router.push(routes.newRequest)}
      title="Propostas"
    />
  )
}
