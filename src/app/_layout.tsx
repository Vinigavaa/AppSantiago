import { Stack } from "expo-router"

import { ConfirmProvider } from "@/components/ui/ConfirmDialog"
import { ToastProvider } from "@/components/ui/Toast"

export default function RootLayout() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(private)" />
        </Stack>
      </ToastProvider>
    </ConfirmProvider>
  )
}
