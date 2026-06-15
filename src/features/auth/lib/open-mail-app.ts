import { Linking, Platform } from "react-native"

// Schemes that abrem diretamente o app de email (inbox). No iOS, exigem estar
// declarados em LSApplicationQueriesSchemes (ver app.json) para o canOpenURL
// retornar true.
const MAIL_APP_SCHEMES =
  Platform.OS === "ios"
    ? ["message://", "googlegmail://", "ms-outlook://", "ymail://"]
    : ["googlegmail://", "ms-outlook://", "ymail://"]

async function firstOpenableScheme(schemes: string[]): Promise<string | null> {
  for (const scheme of schemes) {
    try {
      if (await Linking.canOpenURL(scheme)) {
        return scheme
      }
    } catch {
      // Scheme indisponível, tenta o próximo.
    }
  }

  return null
}

export async function canOpenMailApp(): Promise<boolean> {
  if (await firstOpenableScheme(MAIL_APP_SCHEMES)) {
    return true
  }

  try {
    return await Linking.canOpenURL("mailto:")
  } catch {
    return false
  }
}

export async function openMailApp(): Promise<boolean> {
  const target = (await firstOpenableScheme(MAIL_APP_SCHEMES)) ?? "mailto:"

  try {
    if (await Linking.canOpenURL(target)) {
      await Linking.openURL(target)
      return true
    }
  } catch {
    // Falha ao abrir: o chamador esconde a ação.
  }

  return false
}
