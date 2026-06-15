import { createHash } from "node:crypto"

import { prisma } from "@santiago/database"
import type { Context, MiddlewareHandler, Next } from "hono"

type RateLimitRule = {
  id: string
  limit: number
  windowMs: number
  key: (context: Context) => Promise<string | null> | string | null
  matcher: (context: Context) => boolean
}

function getClientIp(context: Context) {
  const forwardedFor = context.req.header("x-forwarded-for")

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }

  return context.req.header("cf-connecting-ip") ?? context.req.header("x-real-ip") ?? "unknown"
}

function hashRateLimitPart(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

function getStringBodyValue(body: unknown, key: string) {
  if (!body || typeof body !== "object" || !(key in body)) {
    return null
  }

  const value = (body as Record<string, unknown>)[key]

  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function getRequestBody(context: Context) {
  return context.req.raw.clone().json().catch(() => null)
}

async function getIdentityKey(context: Context) {
  const body = await getRequestBody(context)
  const identity =
    getStringBodyValue(body, "email") ?? getStringBodyValue(body, "username")

  if (!identity) {
    return null
  }

  return `identity:${hashRateLimitPart(identity)}`
}

async function getEmailKey(context: Context) {
  const body = await getRequestBody(context)
  const email = getStringBodyValue(body, "email")

  if (!email) {
    return null
  }

  return `email:${hashRateLimitPart(email)}`
}

function getIpKey(context: Context) {
  return `ip:${hashRateLimitPart(getClientIp(context))}`
}

async function rateLimitKey(context: Context, rule: RateLimitRule) {
  const key = await rule.key(context)

  if (!key) {
    return null
  }

  return `${rule.id}:${key}`
}

let lastCleanupAt = 0

async function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 5 * 60 * 1000) {
    return
  }

  lastCleanupAt = now

  await prisma.rateLimitBucket.deleteMany({
    where: {
      resetAt: {
        lt: new Date(now - 60 * 1000),
      },
    },
  })
}

async function applyRateLimit(context: Context, rule: RateLimitRule) {
  const now = Date.now()
  const key = await rateLimitKey(context, rule)

  if (!key) {
    return null
  }

  await cleanupExpiredBuckets(now)

  const resetAt = new Date(now + rule.windowMs)
  const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("id", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `

  if (!bucket) {
    return rateLimitFailureResponse(context)
  }

  if (bucket.count <= rule.limit) {
    return null
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt.getTime() - now) / 1000))

  return context.json(
    {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde um pouco e tente novamente.",
    },
    429,
    {
      "Retry-After": retryAfter.toString(),
      "X-RateLimit-Limit": rule.limit.toString(),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": Math.ceil(bucket.resetAt.getTime() / 1000).toString(),
    },
  )
}

function rateLimitFailureResponse(context: Context) {
  return context.json(
    {
      code: "AUTH_PROTECTION_UNAVAILABLE",
      message: "Nao foi possivel validar a protecao de acesso agora.",
    },
    503,
  )
}

export function createRateLimitMiddleware(rules: RateLimitRule[]): MiddlewareHandler {
  return async (context: Context, next: Next) => {
    if (context.req.method === "OPTIONS") {
      await next()
      return
    }

    for (const rule of rules) {
      if (!rule.matcher(context)) {
        continue
      }

      const response = await applyRateLimit(context, rule).catch(() =>
        rateLimitFailureResponse(context),
      )

      if (response) {
        return response
      }
    }

    await next()
  }
}

export const authRateLimit = createRateLimitMiddleware([
  {
    id: "auth:login:ip",
    limit: 8,
    windowMs: 60 * 1000,
    key: getIpKey,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return context.req.method === "POST" && path.startsWith("/api/auth/sign-in/")
    },
  },
  {
    id: "auth:login:identity",
    limit: 12,
    windowMs: 15 * 60 * 1000,
    key: getIdentityKey,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return context.req.method === "POST" && path.startsWith("/api/auth/sign-in/")
    },
  },
  {
    id: "auth:signup:ip",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    key: getIpKey,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return context.req.method === "POST" && path === "/api/auth/sign-up/email"
    },
  },
  {
    id: "auth:password-reset:ip",
    limit: 4,
    windowMs: 15 * 60 * 1000,
    key: getIpKey,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return (
        context.req.method === "POST" &&
        (path === "/api/auth/request-password-reset" || path === "/api/auth/reset-password")
      )
    },
  },
  {
    id: "auth:password-reset:email",
    limit: 3,
    windowMs: 60 * 60 * 1000,
    key: getEmailKey,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return context.req.method === "POST" && path === "/api/auth/request-password-reset"
    },
  },
  {
    id: "auth:email-verification:ip",
    limit: 6,
    windowMs: 15 * 60 * 1000,
    key: getIpKey,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return (
        (context.req.method === "POST" && path === "/api/auth/send-verification-email") ||
        (context.req.method === "GET" && path === "/api/auth/verify-email")
      )
    },
  },
])
