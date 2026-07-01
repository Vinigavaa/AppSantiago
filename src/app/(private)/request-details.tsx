import { Redirect, useLocalSearchParams } from "expo-router"

import { routes } from "@/constants/routes"
import { RequestDetailsScreen } from "@/features/service-requests/RequestDetailsScreen"

export default function RequestDetails() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!id) {
    return <Redirect href={routes.home} />
  }

  return <RequestDetailsScreen id={id} />
}
