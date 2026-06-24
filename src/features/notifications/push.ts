import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { useEffect, useRef } from "react"
import { Platform } from "react-native"

import { registerPushToken } from "./service"

// Mostra a notificação mesmo com o app em primeiro plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Obtém o token de push da Expo. Retorna null (sem lançar) quando não é possível:
// emulador/web, permissão negada ou projeto EAS ainda não configurado.
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null
  }

  const settings = await Notifications.getPermissionsAsync()
  let status = settings.status

  if (status !== "granted") {
    const request = await Notifications.requestPermissionsAsync()
    status = request.status
  }

  if (status !== "granted") {
    return null
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Padrão",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  // O projectId vem do EAS (app.json -> extra.eas.projectId). Sem ele, não é
  // possível emitir um token de push — apenas registramos o aviso.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

  if (!projectId) {
    console.warn("[push] projectId do EAS ausente; rode `eas init` para habilitar push.")
    return null
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId })
    return token.data
  } catch (error) {
    console.warn("[push] falha ao obter token de push", error)
    return null
  }
}

// Registra o dispositivo para push quando há um usuário autenticado. Best-effort:
// qualquer falha é silenciosa para não atrapalhar a navegação.
export function usePushRegistration(userId: string | undefined) {
  const registeredFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || registeredFor.current === userId) {
      return
    }

    registeredFor.current = userId

    void (async () => {
      const token = await getExpoPushToken()
      if (token) {
        await registerPushToken(token, Platform.OS)
      }
    })()
  }, [userId])
}
