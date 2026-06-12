// Run with EMAIL_PROVIDER=console to avoid the real Resend account:
//   EMAIL_PROVIDER=console npx tsx --tsconfig apps/api/tsconfig.json scripts/auth-security-smoke.ts
// The script seeds throwaway @example.com addresses. If Resend is enabled it
// rejects them with HTTP 403 — Better Auth catches the error in the background,
// so the test still passes, but the noise hides real issues.

import { createHash } from "node:crypto"

import { prisma } from "@santiago/database"
import { createEmailVerificationToken } from "better-auth/api"

import { env } from "../apps/api/src/config/env"
import { app } from "../apps/api/src/http/app"
import { storeEmailVerificationToken } from "../apps/api/src/modules/auth/email-verification-tokens"

const baseUrl = "http://localhost:3333/api/auth"
const origin = "http://localhost:8081"
const suffix = Date.now().toString()
const clientIp = `security-smoke-${suffix}`
const email = `security_smoke_${suffix}@example.com`
const username = `security_smoke_${suffix}`
const password = "Password123!"

function hashRateLimitPart(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

async function request(path: string, init: RequestInit) {
  return app.request(`${baseUrl}${path}`, {
    ...init,
    headers: {
      origin,
      "x-forwarded-for": clientIp,
      ...init.headers,
    },
  })
}

async function post(path: string, body: Record<string, unknown>) {
  const response = await request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

async function get(path: string) {
  return request(path, {
    method: "GET",
  })
}

async function cleanup() {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "security_smoke_",
      },
    },
  })
  await prisma.rateLimitBucket.deleteMany({
    where: {
      OR: [
        { id: { contains: hashRateLimitPart(clientIp) } },
        { id: { contains: hashRateLimitPart(email) } },
        { id: { contains: hashRateLimitPart(username) } },
      ],
    },
  })
}

async function main() {
  await cleanup()

  const adminResponse = await post("/sign-up/email", {
    email,
    password,
    name: username,
    username,
    displayUsername: username,
    role: "ADMIN",
  })

  if (adminResponse.status !== 403) {
    throw new Error(`Expected ADMIN sign-up to be blocked with 403, got ${adminResponse.status}`)
  }

  const adminCreated = await prisma.user.count({ where: { email } })

  if (adminCreated !== 0) {
    throw new Error("ADMIN sign-up created a user")
  }

  const professionalResponse = await post("/sign-up/email", {
    email,
    password,
    name: username,
    username,
    displayUsername: username,
    role: "PROFESSIONAL",
  })

  if (!professionalResponse.ok) {
    throw new Error(
      `Expected PROFESSIONAL sign-up to succeed, got ${professionalResponse.status}: ${JSON.stringify(
        professionalResponse.payload,
      )}`,
    )
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      professionalProfile: true,
      clientProfile: true,
    },
  })

  if (!user || user.role !== "PROFESSIONAL" || !user.professionalProfile || user.clientProfile) {
    throw new Error("Professional sign-up did not persist role/profile correctly")
  }

  if (user.emailVerified) {
    throw new Error("New user should not be email verified before token verification")
  }

  const unverifiedSignIn = await post("/sign-in/username", {
    username,
    password,
  })

  if (unverifiedSignIn.ok) {
    throw new Error("Unverified user was allowed to sign in")
  }

  const emailVerificationToken = await createEmailVerificationToken(
    env.BETTER_AUTH_SECRET,
    email,
    undefined,
    60 * 60,
  )
  await storeEmailVerificationToken({
    token: emailVerificationToken,
    email,
    expiresInSeconds: 60 * 60,
  })

  const verifyResponse = await get(
    `/verify-email?token=${encodeURIComponent(emailVerificationToken)}`,
  )

  if (!verifyResponse.ok) {
    throw new Error(`Expected email verification to succeed, got ${verifyResponse.status}`)
  }

  const verifiedUser = await prisma.user.findUnique({
    where: { email },
  })

  if (!verifiedUser?.emailVerified) {
    throw new Error("Email verification did not mark user as verified")
  }

  const reusedVerifyResponse = await get(
    `/verify-email?token=${encodeURIComponent(emailVerificationToken)}`,
  )

  if (reusedVerifyResponse.ok) {
    throw new Error("Email verification token was reusable")
  }

  const resetRequest = await post("/request-password-reset", {
    email,
  })

  if (!resetRequest.ok) {
    throw new Error(`Expected reset request to succeed, got ${resetRequest.status}`)
  }

  const resetVerification = await prisma.verification.findFirst({
    where: {
      identifier: {
        startsWith: "reset-password:",
      },
      value: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  if (!resetVerification) {
    throw new Error("Reset password token was not persisted")
  }

  const resetToken = resetVerification.identifier.replace("reset-password:", "")
  const resetResponse = await post("/reset-password", {
    token: resetToken,
    newPassword: "Password456!",
  })

  if (!resetResponse.ok) {
    throw new Error(`Expected reset password to succeed, got ${resetResponse.status}`)
  }

  const reusedResetResponse = await post("/reset-password", {
    token: resetToken,
    newPassword: "Password789!",
  })

  if (reusedResetResponse.ok) {
    throw new Error("Reset token was reusable")
  }

  let rateLimitStatus = 0

  for (let index = 0; index < 10; index += 1) {
    const response = await post("/sign-in/username", {
      username: `missing_${suffix}_${index}`,
      password: "WrongPassword123!",
    })
    rateLimitStatus = response.status

    if (response.status === 429) {
      break
    }
  }

  if (rateLimitStatus !== 429) {
    throw new Error("Rate limit did not block repeated sign-in attempts")
  }

  console.log(
    JSON.stringify({
      adminBlocked: true,
      emailVerificationRequired: true,
      emailVerificationSingleUse: true,
      professionalProfileCreated: true,
      resetTokenSingleUse: true,
      rateLimit: true,
    }),
  )
}

main()
  .finally(async () => {
    await cleanup()
    await prisma.$disconnect()
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
