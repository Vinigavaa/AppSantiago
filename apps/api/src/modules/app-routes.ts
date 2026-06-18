import { Hono } from "hono"

import { createRateLimitMiddleware } from "@/http/rate-limit"
import { listCategoriesHandler, listCitiesHandler } from "@/modules/catalog/handlers"
import {
  createServiceRequestHandler,
  listServiceRequestsHandler,
  serviceRequestsSummaryHandler,
} from "@/modules/service-requests/handlers"
import { requireAuth, type AuthenticatedUser } from "@/modules/shared/require-auth"

// Limita a criação de solicitações por IP para evitar flood/duplicação abusiva.
const appRateLimit = createRateLimitMiddleware([
  {
    id: "app:service-request:create",
    limit: 20,
    windowMs: 60 * 60 * 1000,
    key: (context) => `ip:${context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`,
    matcher: (context) => {
      const path = new URL(context.req.url).pathname
      return context.req.method === "POST" && path === "/api/app/service-requests"
    },
  },
])

export const appRoutes = new Hono<{ Variables: { user: AuthenticatedUser } }>()

appRoutes.use("*", appRateLimit)
appRoutes.use("*", requireAuth)

appRoutes.get("/categories", listCategoriesHandler)
appRoutes.get("/cities", listCitiesHandler)

appRoutes.post("/service-requests", createServiceRequestHandler)
appRoutes.get("/service-requests", listServiceRequestsHandler)
appRoutes.get("/service-requests/summary", serviceRequestsSummaryHandler)
