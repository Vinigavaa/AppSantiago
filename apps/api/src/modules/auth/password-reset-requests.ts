import { createHash, randomBytes } from "node:crypto"

import { prisma } from "@santiago/database"

const requestTtlSeconds = 60 * 60

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function generateSecret() {
  return randomBytes(32).toString("base64url")
}

// Remove solicitacoes vencidas de qualquer email. Chamado na criacao para nao
// depender de rotina agendada — o volume e baixo e a tabela fica limpa sozinha.
async function deleteExpiredRequests() {
  await prisma.passwordResetRequest.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}

export async function createPasswordResetRequest(input: {
  requestId: string
  confirmationToken: string
  email: string
  resetToken: string
}) {
  const email = input.email.toLowerCase()

  await deleteExpiredRequests()

  // Cada novo envio invalida os links anteriores: so uma solicitacao vale por
  // email, do mesmo jeito que a verificacao de email faz com seus tokens.
  await prisma.passwordResetRequest.deleteMany({ where: { email } })

  await prisma.passwordResetRequest.create({
    data: {
      id: hashSecret(input.requestId),
      email,
      confirmationTokenHash: hashSecret(input.confirmationToken),
      resetToken: input.resetToken,
      expiresAt: new Date(Date.now() + requestTtlSeconds * 1000),
    },
  })
}

// Marca a solicitacao como confirmada a partir do link do email. Retorna false
// para token inexistente, expirado ou substituido por uma solicitacao mais nova.
export async function confirmPasswordResetRequest(confirmationToken: string) {
  const result = await prisma.passwordResetRequest.updateMany({
    where: {
      confirmationTokenHash: hashSecret(confirmationToken),
      expiresAt: { gt: new Date() },
    },
    data: { confirmedAt: new Date() },
  })

  return result.count > 0
}

// Entrega o token de redefinicao ao app e apaga a linha na mesma operacao. O
// DELETE ... RETURNING evita que duas consultas simultaneas recebam o mesmo
// token: so uma delas remove a linha e volta com o valor.
export async function consumeConfirmedPasswordResetRequest(requestId: string) {
  const rows = await prisma.$queryRaw<Array<{ resetToken: string }>>`
    DELETE FROM "PasswordResetRequest"
    WHERE "id" = ${hashSecret(requestId)}
      AND "confirmedAt" IS NOT NULL
      AND "expiresAt" > NOW()
    RETURNING "resetToken"
  `

  return rows[0]?.resetToken ?? null
}
