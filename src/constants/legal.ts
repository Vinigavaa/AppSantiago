import { Linking } from "react-native"

// Documentos legais servidos pela própria API (apps/api/src/http/legal-pages.ts).
// Configuráveis por env para apontar a um domínio próprio sem alterar código.
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? "https://appsantiago.onrender.com/termos"
export const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://appsantiago.onrender.com/privacidade"

// Abrir um link externo pode falhar (sem navegador, URL inválida). Falhar aqui não
// deve derrubar a tela: registra o contexto e mantém o usuário onde estava.
export async function openLegalPage(url: string) {
  try {
    await Linking.openURL(url)
  } catch (error) {
    console.warn("[legal] não foi possível abrir o documento", { url, error })
  }
}
