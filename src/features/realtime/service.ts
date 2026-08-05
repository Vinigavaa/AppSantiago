import { appFetch, type ApiResult } from "@/lib/api-client"

// Ticket de uso único que autentica o handshake do WebSocket. É obtido pela rota
// autenticada normal (com o cookie de sessão) porque o handshake em si não
// carrega o cookie de forma confiável no navegador.
export async function fetchRealtimeTicket(): Promise<ApiResult<{ ticket: string }>> {
  return appFetch<{ ticket: string; expiresIn: number }>("/realtime/ticket", { method: "POST" })
}
