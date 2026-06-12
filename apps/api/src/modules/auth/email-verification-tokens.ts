import { createHash } from "node:crypto"

import { prisma } from "@santiago/database"

const emailVerificationPrefix = "email-verification:"

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function getEmailVerificationIdentifier(token: string) {
  return `${emailVerificationPrefix}${hashEmailVerificationToken(token)}`
}

export async function storeEmailVerificationToken(input: {
  token: string
  email: string
  expiresInSeconds: number
}) {
  await prisma.verification.create({
    data: {
      identifier: getEmailVerificationIdentifier(input.token),
      value: input.email.toLowerCase(),
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    },
  })
}

export async function findEmailVerificationToken(token: string) {
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: getEmailVerificationIdentifier(token),
    },
  })

  if (!verification || verification.expiresAt < new Date()) {
    return null
  }

  return verification
}

export async function consumeEmailVerificationToken(token: string) {
  await prisma.verification.deleteMany({
    where: {
      identifier: getEmailVerificationIdentifier(token),
    },
  })
}
