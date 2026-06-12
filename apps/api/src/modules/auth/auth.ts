import { expo } from "@better-auth/expo"
import { prisma } from "@santiago/database"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { username } from "better-auth/plugins"

import { corsOrigins, env } from "@/config/env"
import type { PublicAuthRole } from "@/types/auth"

function isPublicAuthRole(value: unknown): value is PublicAuthRole {
  return value === "CLIENT" || value === "PROFESSIONAL"
}

function getPublicAuthRole(value: unknown): PublicAuthRole {
  return isPublicAuthRole(value) ? value : "CLIENT"
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [
    ...corsOrigins,
    "santiago://",
    "santiago://*",
    ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
  ],
  emailAndPassword: {
    enabled: true,
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
