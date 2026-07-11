// Usuário que o usuário atual bloqueou, exibido na tela "Usuários bloqueados".
export type BlockedUser = {
  userId: string
  name: string
  avatarUrl: string | null
  role: "CLIENT" | "PROFESSIONAL" | "ADMIN"
  blockedAt: string
}
