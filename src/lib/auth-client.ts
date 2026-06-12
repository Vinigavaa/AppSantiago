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

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
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
