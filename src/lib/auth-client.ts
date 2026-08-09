import { Platform } from "react-native"

import { expoClient } from "@better-auth/expo/client"
import Constants from "expo-constants"
import * as SecureStore from "expo-secure-store"
import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins"

function getAuthBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL

  if (envUrl) {
    return envUrl
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin
  }

  const hostUri = Constants.expoConfig?.hostUri

  if (hostUri) {
    const host = hostUri.split(":")[0]
    return `http://${host}:3333`
  }

  return "http://localhost:3333"
}

export const authBaseUrl = getAuthBaseUrl()

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: true,
        },
      },
    }),
    usernameClient(),
    expoClient({
      scheme: "santiago",
      storagePrefix: "santiago",
      storage: SecureStore,
    }),
  ],
})

// Força o `useSession` a buscar a sessão de novo. Necessário quando alteramos
// dados do usuário por fora do better-auth (ex.: a foto de perfil, que sobe
// pelo endpoint de uploads): sem isso, telas que leem `session.user` — como o
// cabeçalho da home — continuam com o valor antigo até o app reabrir.
export function refreshSession() {
  authClient.$store.notify("$sessionSignal")
}
