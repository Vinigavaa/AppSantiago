import { Redirect, useLocalSearchParams } from "expo-router"

import { routes } from "@/constants/routes"
import { EditRequestScreen } from "@/features/service-requests/EditRequestScreen"

export default function EditRequest() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!id) {
    return <Redirect href={routes.home} />
  }

  return <EditRequestScreen id={id} />
}
