import { Platform } from "react-native"

import * as SecureStore from "expo-secure-store"

// expo-secure-store não existe na web. Lá usamos localStorage como fallback
// (dados de baixa sensibilidade como o email pendente de verificação).
const isWeb = Platform.OS === "web"

function getWebStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage
  }

  return null
}

export async function saveSecureItem(key: string, value: string) {
  if (isWeb) {
    getWebStorage()?.setItem(key, value)
    return
  }

  await SecureStore.setItemAsync(key, value)
}

export async function getSecureItem(key: string) {
  if (isWeb) {
    return getWebStorage()?.getItem(key) ?? null
  }

  return SecureStore.getItemAsync(key)
}

export async function removeSecureItem(key: string) {
  if (isWeb) {
    getWebStorage()?.removeItem(key)
    return
  }

  await SecureStore.deleteItemAsync(key)
}
