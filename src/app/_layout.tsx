import { Stack } from "expo-router"

import { ConfirmProvider } from "@/components/ui/ConfirmDialog"

export default function RootLayout() {
  return (
    <ConfirmProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(private)" />
      </Stack>
    </ConfirmProvider>
  )
}
