import { expo } from "@better-auth/expo"
import { prisma } from "@santiago/database"
import { APIError } from "better-auth/api"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { username } from "better-auth/plugins"

import { corsOrigins, env } from "@/config/env"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/services/email-service"

import {
  getEmailVerificationUrl,
  getPasswordResetUrl,
  getTrustedRedirectOrigins,
} from "./auth-urls"
import {
  consumeEmailVerificationToken,
  findEmailVerificationToken,
  storeEmailVerificationToken,
} from "./email-verification-tokens"
import type { PublicAuthRole } from "./schemas"

function isPublicAuthRole(value: unknown): value is PublicAuthRole {
  return value === "CLIENT" || value === "PROFESSIONAL"
}

function getPublicAuthRole(value: unknown): PublicAuthRole {
  if (value === undefined || value === null || value === "") {
    return "CLIENT"
  }

  if (isPublicAuthRole(value)) {
    return value
  }

  throw APIError.from("FORBIDDEN", {
    code: "PUBLIC_ADMIN_SIGN_UP_BLOCKED",
    message: "Cadastro publico permite apenas CLIENT ou PROFESSIONAL.",
  })
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    ...corsOrigins,
    ...getTrustedRedirectOrigins(),
    ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url: getPasswordResetUrl(token),
        userName: user.name,
      })
    },
    customSyntheticUser: ({ additionalFields, coreFields, id }) => ({
      ...coreFields,
      ...additionalFields,
      id,
      role: "CLIENT",
    }),
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    // false: o reenvio é feito pela tela de verificação (botão dedicado). Com
    // true, cada login silencioso de polling reenviaria um email duplicado.
    sendOnSignIn: false,
    sendOnSignUp: true,
    beforeEmailVerification: async (user, request) => {
      const url = request ? new URL(request.url) : null
      const token = url?.searchParams.get("token")
      const verification = token ? await findEmailVerificationToken(token) : null

      if (!verification || verification.value !== user.email.toLowerCase()) {
        throw APIError.from("BAD_REQUEST", {
          code: "INVALID_TOKEN",
          message: "Token de verificacao invalido ou expirado.",
        })
      }
    },
    afterEmailVerification: async (_user, request) => {
      const url = request ? new URL(request.url) : null
      const token = url?.searchParams.get("token")

      if (token) {
        await consumeEmailVerificationToken(token)
      }
    },
    sendVerificationEmail: async ({ user, token }) => {
      console.info(
        JSON.stringify({
          type: "email_verification_hook",
          to: user.email,
        }),
      )
      await storeEmailVerificationToken({
        token,
        email: user.email,
        expiresInSeconds: 60 * 60,
      })
      await sendVerificationEmail({
        to: user.email,
        url: getEmailVerificationUrl(token),
        userName: user.name,
      })
    },
  },
  user: {
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      role: {
        type: ["CLIENT", "PROFESSIONAL", "ADMIN"],
        required: true,
        defaultValue: "CLIENT",
      },
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              emailVerified: false,
              role: getPublicAuthRole(user.role),
            },
          }
        },
        after: async (user) => {
          const role = getPublicAuthRole(user.role)

          if (role === "CLIENT") {
            await prisma.clientProfile.upsert({
              where: { userId: user.id },
              update: {},
              create: { userId: user.id },
            })
            return
          }

          await prisma.professionalProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id },
          })
        },
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
    expo(),
  ],
})
